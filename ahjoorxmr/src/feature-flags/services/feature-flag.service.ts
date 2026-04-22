import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import {
  FeatureFlagConfig,
  TargetingStrategy,
  FeatureFlagEvaluation,
} from '../entities/feature-flag.entity';
import { UserRole } from '../../users/entities/user.entity';
import * as crypto from 'crypto';

/**
 * Service for managing feature flags with Redis backend
 * Supports multiple targeting strategies and local caching
 */
@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly REDIS_KEY = 'feature_flags';
  private readonly CACHE_TTL_SECONDS = 30;
  private localCache: Map<
    string,
    { flag: FeatureFlagConfig; expiresAt: number }
  > = new Map();

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.initializeFromEnv();
  }

  /**
   * Initialize feature flags from environment variable
   * Environment variable overrides Redis for emergency kill-switches
   */
  private async initializeFromEnv(): Promise<void> {
    const envFlags = this.configService.get<string>('FEATURE_FLAGS');
    if (!envFlags) return;

    try {
      const flags: Record<string, FeatureFlagConfig> = JSON.parse(envFlags);

      for (const [name, config] of Object.entries(flags)) {
        await this.setFlag(name, config);
        this.logger.log(`Initialized feature flag from env: ${name}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to parse FEATURE_FLAGS env var: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<Record<string, FeatureFlagConfig>> {
    try {
      const flags = await this.redisService.get<
        Record<string, FeatureFlagConfig>
      >(this.REDIS_KEY);
      return flags || {};
    } catch (error) {
      this.logger.error(`Failed to get all flags: ${(error as Error).message}`);
      return {};
    }
  }

  /**
   * Get a specific feature flag
   */
  async getFlag(name: string): Promise<FeatureFlagConfig | null> {
    // Check local cache first
    const cached = this.localCache.get(name);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.flag;
    }

    // Check environment variable override
    const envFlags = this.configService.get<string>('FEATURE_FLAGS');
    if (envFlags) {
      try {
        const flags = JSON.parse(envFlags);
        if (flags[name]) {
          this.cacheFlag(name, flags[name]);
          return flags[name];
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Get from Redis
    const allFlags = await this.getAllFlags();
    const flag = allFlags[name] || null;

    if (flag) {
      this.cacheFlag(name, flag);
    }

    return flag;
  }

  /**
   * Set or update a feature flag
   */
  async setFlag(
    name: string,
    config: Partial<FeatureFlagConfig>,
  ): Promise<FeatureFlagConfig> {
    const allFlags = await this.getAllFlags();
    const existingFlag = allFlags[name];

    const now = new Date();
    const flag: FeatureFlagConfig = {
      name,
      description: config.description,
      enabled: config.enabled ?? true,
      strategy: config.strategy ?? TargetingStrategy.DISABLED,
      percentage: config.percentage,
      userIds: config.userIds,
      roles: config.roles,
      createdAt: existingFlag?.createdAt || now,
      updatedAt: now,
    };

    // Validate configuration
    this.validateFlagConfig(flag);

    allFlags[name] = flag;
    await this.redisService.set(this.REDIS_KEY, allFlags);

    // Invalidate local cache
    this.localCache.delete(name);

    this.logger.log(`Feature flag ${name} updated: ${JSON.stringify(flag)}`);

    return flag;
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(name: string): Promise<void> {
    const allFlags = await this.getAllFlags();

    if (!allFlags[name]) {
      throw new NotFoundException(`Feature flag '${name}' not found`);
    }

    delete allFlags[name];
    await this.redisService.set(this.REDIS_KEY, allFlags);

    // Invalidate local cache
    this.localCache.delete(name);

    this.logger.log(`Feature flag ${name} deleted`);
  }

  /**
   * Evaluate if a feature flag is enabled for a specific user
   */
  async isEnabled(
    flagName: string,
    userId?: string,
    userRole?: UserRole,
  ): Promise<boolean> {
    const evaluation = await this.evaluate(flagName, userId, userRole);
    return evaluation.enabled;
  }

  /**
   * Evaluate a feature flag with detailed reasoning
   */
  async evaluate(
    flagName: string,
    userId?: string,
    userRole?: UserRole,
  ): Promise<FeatureFlagEvaluation> {
    const flag = await this.getFlag(flagName);

    if (!flag) {
      return {
        flagName,
        enabled: false,
        strategy: TargetingStrategy.DISABLED,
        reason: 'Flag not found',
      };
    }

    if (!flag.enabled) {
      return {
        flagName,
        enabled: false,
        strategy: flag.strategy,
        reason: 'Flag is disabled',
      };
    }

    switch (flag.strategy) {
      case TargetingStrategy.ENABLED_FOR_ALL:
        return {
          flagName,
          enabled: true,
          strategy: flag.strategy,
          reason: 'Enabled for all users',
        };

      case TargetingStrategy.ENABLED_FOR_PERCENTAGE:
        if (!userId) {
          return {
            flagName,
            enabled: false,
            strategy: flag.strategy,
            reason: 'User ID required for percentage-based targeting',
          };
        }
        const enabled = this.isInPercentage(
          userId,
          flagName,
          flag.percentage || 0,
        );
        return {
          flagName,
          enabled,
          strategy: flag.strategy,
          reason: enabled
            ? `User in ${flag.percentage}% rollout`
            : `User not in ${flag.percentage}% rollout`,
        };

      case TargetingStrategy.ENABLED_FOR_USERS:
        if (!userId) {
          return {
            flagName,
            enabled: false,
            strategy: flag.strategy,
            reason: 'User ID required for user-based targeting',
          };
        }
        const isInUserList = flag.userIds?.includes(userId) || false;
        return {
          flagName,
          enabled: isInUserList,
          strategy: flag.strategy,
          reason: isInUserList ? 'User in allowlist' : 'User not in allowlist',
        };

      case TargetingStrategy.ENABLED_FOR_ROLES:
        if (!userRole) {
          return {
            flagName,
            enabled: false,
            strategy: flag.strategy,
            reason: 'User role required for role-based targeting',
          };
        }
        const isInRoleList = flag.roles?.includes(userRole) || false;
        return {
          flagName,
          enabled: isInRoleList,
          strategy: flag.strategy,
          reason: isInRoleList
            ? `Role ${userRole} in allowlist`
            : `Role ${userRole} not in allowlist`,
        };

      case TargetingStrategy.DISABLED:
      default:
        return {
          flagName,
          enabled: false,
          strategy: flag.strategy,
          reason: 'Flag is disabled',
        };
    }
  }

  /**
   * Determine if a user is in the percentage rollout using consistent hashing
   */
  private isInPercentage(
    userId: string,
    flagName: string,
    percentage: number,
  ): boolean {
    if (percentage <= 0) return false;
    if (percentage >= 100) return true;

    // Use consistent hashing to determine if user is in percentage
    const hash = crypto
      .createHash('md5')
      .update(`${flagName}:${userId}`)
      .digest('hex');

    // Convert first 8 characters of hash to number between 0-100
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const userPercentile = (hashValue % 100) + 1;

    return userPercentile <= percentage;
  }

  /**
   * Cache a flag locally for 30 seconds
   */
  private cacheFlag(name: string, flag: FeatureFlagConfig): void {
    this.localCache.set(name, {
      flag,
      expiresAt: Date.now() + this.CACHE_TTL_SECONDS * 1000,
    });
  }

  /**
   * Validate feature flag configuration
   */
  private validateFlagConfig(flag: FeatureFlagConfig): void {
    if (flag.strategy === TargetingStrategy.ENABLED_FOR_PERCENTAGE) {
      if (
        flag.percentage === undefined ||
        flag.percentage < 0 ||
        flag.percentage > 100
      ) {
        throw new Error(
          'Percentage must be between 0 and 100 for ENABLED_FOR_PERCENTAGE strategy',
        );
      }
    }

    if (flag.strategy === TargetingStrategy.ENABLED_FOR_USERS) {
      if (!flag.userIds || flag.userIds.length === 0) {
        throw new Error(
          'userIds array is required for ENABLED_FOR_USERS strategy',
        );
      }
    }

    if (flag.strategy === TargetingStrategy.ENABLED_FOR_ROLES) {
      if (!flag.roles || flag.roles.length === 0) {
        throw new Error(
          'roles array is required for ENABLED_FOR_ROLES strategy',
        );
      }
    }
  }

  /**
   * Clear local cache (useful for testing)
   */
  clearCache(): void {
    this.localCache.clear();
  }
}
