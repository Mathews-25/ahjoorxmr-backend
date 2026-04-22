import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SlowRequestLogService } from '../services/slow-request-log.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

/**
 * Admin controller for slow request monitoring
 */
@ApiTags('Admin')
@Controller({ path: 'admin/slow-requests', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class SlowRequestsAdminController {
  constructor(private readonly slowRequestLogService: SlowRequestLogService) {}

  @Get()
  @ApiOperation({
    summary: 'Get recent slow requests',
    description:
      'Returns the last N slow request log entries from the structured log file. ' +
      'Requires admin role.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of entries to return (default: 100, max: 500)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of slow request log entries',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async getSlowRequests(@Query('limit') limit?: number) {
    const queryLimit = Math.min(limit || 100, 500);
    return this.slowRequestLogService.getRecentSlowRequests(queryLimit);
  }

  @Get('by-route')
  @ApiOperation({
    summary: 'Get slow requests by route',
    description: 'Returns slow requests filtered by route pattern.',
  })
  @ApiQuery({
    name: 'route',
    required: true,
    type: String,
    description: 'Route pattern to filter by',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of entries to return (default: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of slow request log entries for the specified route',
  })
  async getSlowRequestsByRoute(
    @Query('route') route: string,
    @Query('limit') limit?: number,
  ) {
    const queryLimit = Math.min(limit || 100, 500);
    return this.slowRequestLogService.getSlowRequestsByRoute(route, queryLimit);
  }

  @Get('by-user')
  @ApiOperation({
    summary: 'Get slow requests by user',
    description: 'Returns slow requests for a specific user.',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    type: String,
    description: 'User ID to filter by',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of entries to return (default: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of slow request log entries for the specified user',
  })
  async getSlowRequestsByUser(
    @Query('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    const queryLimit = Math.min(limit || 100, 500);
    return this.slowRequestLogService.getSlowRequestsByUser(userId, queryLimit);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get slow request statistics',
    description:
      'Returns aggregated statistics about slow requests including top routes and average durations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Slow request statistics',
  })
  async getSlowRequestStats() {
    return this.slowRequestLogService.getSlowRequestStats();
  }
}
