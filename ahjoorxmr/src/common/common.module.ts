import { Module } from '@nestjs/common';
import { SlowRequestLogService } from './services/slow-request-log.service';
import { SlowRequestsAdminController } from './controllers/slow-requests-admin.controller';

/**
 * Common module for shared services and controllers
 */
@Module({
  controllers: [SlowRequestsAdminController],
  providers: [SlowRequestLogService],
  exports: [SlowRequestLogService],
})
export class CommonModule {}
