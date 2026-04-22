import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeatureFlagService } from './feature-flag.service';
import { RedisService } from '../../common/redis/redis.service';
import { TargetingStrategy } from '../entities/feature-flag.entity';
import { UserRole } from '../../users/entities/user.entity';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let redisService: RedisService;
  let configService: ConfigService;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FeatureFlagService>(FeatureFlagService);
    redisService = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
    service.clearCache();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ENABLED_FOR_ALL strategy', () => {
    it('should enable flag for all users', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_ALL,
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      const result = await service.isEnabled('test_flag', 'user-123');
      expect(result).toBe(true);
    });

    it('should work without user ID', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_ALL,
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      const result = await service.isEnabled('test_flag');
      expect(result).toBe(true);
    });
  });

  describe('ENABLED_FOR_PERCENTAGE strategy', () => {
    it('should enable flag for users in percentage', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_PERCENTAGE,
        percentage: 100,
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      const result = await service.isEnabled('test_flag', 'user-123');
      expect(result).toBe(true);
    });

    it('should disable flag for users not in percentage', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_PERCENTAGE,
        percentage: 0,
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      const result = await service.isEnabled('test_flag', 'user-123');
      expect(result).toBe(false);
    });

    it('should require user ID for percentage-based targeting', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_PERCENTAGE,
        percentage: 50,
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      const result = await service.isEnabled('test_flag');
      expect(result).toBe(false);
    });

    it('should use consistent hashing for percentage rollout', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_PERCENTAGE,
        percentage: 50,
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      // Same user should get same result
      const result1 = await service.isEnabled('test_flag', 'user-123');
      const result2 = await service.isEnabled('test_flag', 'user-123');
      expect(result1).toBe(result2);
    });
  });

  describe('ENABLED_FOR_USERS strategy', () => {
    it('should enable flag for users in allowlist', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_USERS,
        userIds: ['user-123', 'user-456'],
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      const result = await service.isEnabled('test_flag', 'user-123');
      expect(result).toBe(true);
    });

    it('should disable flag for users not in allowlist', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_USERS,
        userIds: ['user-123', 'user-456'],
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      const result = await service.isEnabled('test_flag', 'user-789');
      expect(result).toBe(false);
    });

    it('should require user ID for user-based targeting', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_USERS,
        userIds: ['user-123'],
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      const result = await service.isEnabled('test_flag');
      expect(result).toBe(false);
    });
  });

  describe('ENABLED_FOR_ROLES strategy', () => {
    it('should enable flag for users with allowed roles', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_ROLES,
        roles: [UserRole.ADMIN],
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      const result = await service.isEnabled(
        'test_flag',
        'user-123',
        UserRole.ADMIN,
      );
      expect(result).toBe(true);
    });

    it('should disable flag for users without allowed roles', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_ROLES,
        roles: [UserRole.ADMIN],
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      const result = await service.isEnabled(
        'test_flag',
        'user-123',
        UserRole.USER,
      );
      expect(result).toBe(false);
    });

    it('should require user role for role-based targeting', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_ROLES,
        roles: [UserRole.ADMIN],
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      const result = await service.isEnabled('test_flag', 'user-123');
      expect(result).toBe(false);
    });
  });

  describe('Flag management', () => {
    it('should create a new flag', async () => {
      mockRedisService.get.mockResolvedValue({});
      mockRedisService.set.mockResolvedValue(undefined);

      const flag = await service.setFlag('new_flag', {
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_ALL,
      });

      expect(flag.name).toBe('new_flag');
      expect(flag.enabled).toBe(true);
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should update an existing flag', async () => {
      const existingFlag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_ALL,
        createdAt: new Date('2026-01-01'),
      };

      mockRedisService.get.mockResolvedValue({ test_flag: existingFlag });
      mockRedisService.set.mockResolvedValue(undefined);

      const updatedFlag = await service.setFlag('test_flag', {
        enabled: false,
      });

      expect(updatedFlag.enabled).toBe(false);
      expect(updatedFlag.createdAt).toEqual(existingFlag.createdAt);
    });

    it('should delete a flag', async () => {
      mockRedisService.get.mockResolvedValue({
        test_flag: { name: 'test_flag', enabled: true },
      });
      mockRedisService.set.mockResolvedValue(undefined);

      await service.deleteFlag('test_flag');

      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should throw error when deleting non-existent flag', async () => {
      mockRedisService.get.mockResolvedValue({});

      await expect(service.deleteFlag('non_existent')).rejects.toThrow();
    });
  });

  describe('Validation', () => {
    it('should validate percentage range', async () => {
      mockRedisService.get.mockResolvedValue({});

      await expect(
        service.setFlag('test_flag', {
          enabled: true,
          strategy: TargetingStrategy.ENABLED_FOR_PERCENTAGE,
          percentage: 150,
        }),
      ).rejects.toThrow();
    });

    it('should require userIds for ENABLED_FOR_USERS', async () => {
      mockRedisService.get.mockResolvedValue({});

      await expect(
        service.setFlag('test_flag', {
          enabled: true,
          strategy: TargetingStrategy.ENABLED_FOR_USERS,
        }),
      ).rejects.toThrow();
    });

    it('should require roles for ENABLED_FOR_ROLES', async () => {
      mockRedisService.get.mockResolvedValue({});

      await expect(
        service.setFlag('test_flag', {
          enabled: true,
          strategy: TargetingStrategy.ENABLED_FOR_ROLES,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Caching', () => {
    it('should cache flag evaluations', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_ALL,
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      // First call
      await service.isEnabled('test_flag');

      // Second call should use cache
      await service.isEnabled('test_flag');

      // Redis should only be called once
      expect(mockRedisService.get).toHaveBeenCalledTimes(1);
    });

    it('should clear cache', () => {
      service.clearCache();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Environment variable override', () => {
    it('should prioritize env var over Redis', async () => {
      const envFlag = {
        test_flag: {
          name: 'test_flag',
          enabled: false,
          strategy: TargetingStrategy.DISABLED,
        },
      };

      mockConfigService.get.mockReturnValue(JSON.stringify(envFlag));
      mockRedisService.get.mockResolvedValue({
        test_flag: {
          name: 'test_flag',
          enabled: true,
          strategy: TargetingStrategy.ENABLED_FOR_ALL,
        },
      });

      const result = await service.isEnabled('test_flag');
      expect(result).toBe(false);
    });
  });

  describe('Evaluation with detailed reasoning', () => {
    it('should return detailed evaluation result', async () => {
      const flag = {
        name: 'test_flag',
        enabled: true,
        strategy: TargetingStrategy.ENABLED_FOR_ALL,
      };

      mockRedisService.get.mockResolvedValue({ test_flag: flag });

      const evaluation = await service.evaluate('test_flag');

      expect(evaluation.flagName).toBe('test_flag');
      expect(evaluation.enabled).toBe(true);
      expect(evaluation.strategy).toBe(TargetingStrategy.ENABLED_FOR_ALL);
      expect(evaluation.reason).toBeTruthy();
    });

    it('should return disabled for non-existent flag', async () => {
      mockRedisService.get.mockResolvedValue({});

      const evaluation = await service.evaluate('non_existent');

      expect(evaluation.enabled).toBe(false);
      expect(evaluation.reason).toContain('not found');
    });
  });
});
