import { Module } from '@nestjs/common';
import { FeatureFlagService } from './services/feature-flag.service';
import { FeatureFlagsAdminController } from './controllers/feature-flags-admin.controller';
import { FeatureFlagGuard } from './guards/feature-flag.guard';
import { RedisModule } from '../common/redis/redis.module';

/**
 * Module for feature flag management
 * Provides services, controllers, and guards for progressive feature rollouts
 */
@Module({
  imports: [RedisModule],
  controllers: [FeatureFlagsAdminController],
  providers: [FeatureFlagService, FeatureFlagGuard],
  exports: [FeatureFlagService, FeatureFlagGuard],
})
export class FeatureFlagsModule {}
