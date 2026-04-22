import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FeatureFlagService } from '../services/feature-flag.service';
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  FeatureFlagResponseDto,
} from '../dto/feature-flag.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

/**
 * Admin controller for managing feature flags at runtime
 */
@ApiTags('Feature Flags Admin')
@Controller({ path: 'admin/feature-flags', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class FeatureFlagsAdminController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all feature flags',
    description:
      'Returns all configured feature flags with their current settings. ' +
      'Requires admin role.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all feature flags',
    type: [FeatureFlagResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async getAllFlags(): Promise<Record<string, FeatureFlagResponseDto>> {
    return this.featureFlagService.getAllFlags();
  }

  @Get(':name')
  @ApiOperation({
    summary: 'Get a specific feature flag',
    description: 'Returns the configuration for a specific feature flag.',
  })
  @ApiParam({
    name: 'name',
    description: 'Name of the feature flag',
    example: 'websocket_notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag configuration',
    type: FeatureFlagResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Feature flag not found',
  })
  async getFlag(@Param('name') name: string): Promise<FeatureFlagResponseDto> {
    const flag = await this.featureFlagService.getFlag(name);
    if (!flag) {
      throw new Error(`Feature flag '${name}' not found`);
    }
    return flag as FeatureFlagResponseDto;
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new feature flag',
    description:
      'Creates a new feature flag with the specified configuration. ' +
      'The flag is immediately active based on its targeting strategy.',
  })
  @ApiResponse({
    status: 201,
    description: 'Feature flag created successfully',
    type: FeatureFlagResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration',
  })
  @HttpCode(HttpStatus.CREATED)
  async createFlag(
    @Body() createDto: CreateFeatureFlagDto,
  ): Promise<FeatureFlagResponseDto> {
    return this.featureFlagService.setFlag(createDto.name, createDto);
  }

  @Put(':name')
  @ApiOperation({
    summary: 'Update an existing feature flag',
    description:
      'Updates the configuration of an existing feature flag. ' +
      'Changes take effect immediately (with up to 30s cache delay).',
  })
  @ApiParam({
    name: 'name',
    description: 'Name of the feature flag to update',
    example: 'websocket_notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag updated successfully',
    type: FeatureFlagResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration',
  })
  @ApiResponse({
    status: 404,
    description: 'Feature flag not found',
  })
  async updateFlag(
    @Param('name') name: string,
    @Body() updateDto: UpdateFeatureFlagDto,
  ): Promise<FeatureFlagResponseDto> {
    // Check if flag exists
    const existingFlag = await this.featureFlagService.getFlag(name);
    if (!existingFlag) {
      throw new Error(`Feature flag '${name}' not found`);
    }

    return this.featureFlagService.setFlag(name, updateDto);
  }

  @Delete(':name')
  @ApiOperation({
    summary: 'Delete a feature flag',
    description:
      'Permanently deletes a feature flag. ' +
      'Use with caution as this cannot be undone.',
  })
  @ApiParam({
    name: 'name',
    description: 'Name of the feature flag to delete',
    example: 'websocket_notifications',
  })
  @ApiResponse({
    status: 204,
    description: 'Feature flag deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Feature flag not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFlag(@Param('name') name: string): Promise<void> {
    await this.featureFlagService.deleteFlag(name);
  }

  @Post(':name/evaluate')
  @ApiOperation({
    summary: 'Evaluate a feature flag for a specific user',
    description:
      'Tests whether a feature flag would be enabled for a given user. ' +
      'Useful for debugging targeting rules.',
  })
  @ApiParam({
    name: 'name',
    description: 'Name of the feature flag',
    example: 'websocket_notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag evaluation result',
  })
  async evaluateFlag(
    @Param('name') name: string,
    @Body() body: { userId?: string; userRole?: UserRole },
  ) {
    return this.featureFlagService.evaluate(name, body.userId, body.userRole);
  }
}
