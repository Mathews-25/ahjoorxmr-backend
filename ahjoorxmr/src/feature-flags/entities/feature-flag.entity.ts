import { UserRole } from '../../users/entities/user.entity';

/**
 * Targeting strategy for feature flags
 */
export enum TargetingStrategy {
  ENABLED_FOR_ALL = 'enabled_for_all',
  ENABLED_FOR_PERCENTAGE = 'enabled_for_percentage',
  ENABLED_FOR_USERS = 'enabled_for_users',
  ENABLED_FOR_ROLES = 'enabled_for_roles',
  DISABLED = 'disabled',
}

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  name: string;
  description?: string;
  enabled: boolean;
  strategy: TargetingStrategy;
  percentage?: number; // 0-100 for ENABLED_FOR_PERCENTAGE
  userIds?: string[]; // For ENABLED_FOR_USERS
  roles?: UserRole[]; // For ENABLED_FOR_ROLES
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Feature flag evaluation result
 */
export interface FeatureFlagEvaluation {
  flagName: string;
  enabled: boolean;
  strategy: TargetingStrategy;
  reason: string;
}
