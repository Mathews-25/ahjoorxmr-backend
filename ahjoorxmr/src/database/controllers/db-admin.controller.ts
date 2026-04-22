import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { QueryPerformanceService } from '../services/query-performance.service';
import { SlowQueryDto, QueryAnalysisDto } from '../dto/slow-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

/**
 * Admin controller for database performance monitoring
 */
@ApiTags('Database Admin')
@Controller({ path: 'admin/db', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class DbAdminController {
  constructor(
    private readonly queryPerformanceService: QueryPerformanceService,
  ) {}

  @Get('slow-queries')
  @ApiOperation({
    summary: 'Get top slowest queries',
    description:
      'Returns the top N slowest queries by mean execution time from pg_stat_statements. ' +
      'Requires admin role.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of queries to return (default: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of slow queries',
    type: [SlowQueryDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async getSlowQueries(
    @Query('limit') limit?: number,
  ): Promise<SlowQueryDto[]> {
    const queryLimit = Math.min(limit || 20, 100);
    return this.queryPerformanceService.getSlowQueries(queryLimit);
  }

  @Get('query-analysis')
  @ApiOperation({
    summary: 'Get query analysis history',
    description:
      'Returns historical EXPLAIN ANALYZE results for queries. ' +
      'Can be filtered by query hash.',
  })
  @ApiQuery({
    name: 'queryHash',
    required: false,
    type: String,
    description: 'Filter by specific query hash',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return (default: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of query analysis records',
    type: [QueryAnalysisDto],
  })
  async getQueryAnalysisHistory(
    @Query('queryHash') queryHash?: string,
    @Query('limit') limit?: number,
  ): Promise<QueryAnalysisDto[]> {
    const queryLimit = Math.min(limit || 100, 500);
    return this.queryPerformanceService.getQueryAnalysisHistory(
      queryHash,
      queryLimit,
    );
  }

  @Post('analyze-now')
  @ApiOperation({
    summary: 'Trigger immediate query analysis',
    description:
      'Manually trigger the query analysis process instead of waiting for the scheduled task.',
  })
  @ApiResponse({
    status: 200,
    description: 'Analysis triggered successfully',
  })
  async triggerAnalysis(): Promise<{ message: string }> {
    await this.queryPerformanceService.analyzeSlowQueries();
    return { message: 'Query analysis completed successfully' };
  }

  @Post('reset-statistics')
  @ApiOperation({
    summary: 'Reset pg_stat_statements statistics',
    description:
      'Clears all collected query statistics. Use with caution as this removes all historical data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics reset successfully',
  })
  async resetStatistics(): Promise<{ message: string }> {
    await this.queryPerformanceService.resetStatistics();
    return { message: 'Query statistics reset successfully' };
  }
}
