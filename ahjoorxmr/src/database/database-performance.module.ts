import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueryAnalysis } from './entities/query-analysis.entity';
import { QueryPerformanceService } from './services/query-performance.service';
import { DbAdminController } from './controllers/db-admin.controller';
import { SlowQueryLogger } from './interceptors/slow-query.interceptor';
import { NotificationModule } from '../notification/notifications.module';

/**
 * Module for database performance monitoring and analysis
 */
@Module({
  imports: [TypeOrmModule.forFeature([QueryAnalysis]), NotificationModule],
  controllers: [DbAdminController],
  providers: [QueryPerformanceService, SlowQueryLogger],
  exports: [QueryPerformanceService, SlowQueryLogger],
})
export class DatabasePerformanceModule {}
