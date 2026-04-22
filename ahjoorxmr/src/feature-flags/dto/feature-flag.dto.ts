import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { TargetingStrategy } from '../entities/feature-flag.entity';
import { UserRole } from '../../users/entities/user.entity';

export class CreateFeatureFlagDto {
  @ApiProperty({
    description: 'Unique name of the feature flag',
    example: 'websocket_notifications',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the feature flag',
    example: 'Enable WebSocket-based real-time notifications',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the flag is enabled',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'Targeting strategy',
    enum: TargetingStrategy,
    example: TargetingStrategy.ENABLED_FOR_PERCENTAGE,
  })
  @IsEnum(TargetingStrategy)
  strategy: TargetingStrategy;

  @ApiProperty({
    description:
      'Percentage of users to enable (0-100), required for ENABLED_FOR_PERCENTAGE',
    example: 25,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  percentage?: number;

  @ApiProperty({
    description: 'Array of user IDs to enable, required for ENABLED_FOR_USERS',
    example: ['user-123', 'user-456'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userIds?: string[];

  @ApiProperty({
    description: 'Array of roles to enable, required for ENABLED_FOR_ROLES',
    enum: UserRole,
    isArray: true,
    example: [UserRole.ADMIN],
    required: false,
  })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  @IsOptional()
  roles?: UserRole[];
}

export class UpdateFeatureFlagDto {
  @ApiProperty({
    description: 'Description of the feature flag',
    example: 'Enable WebSocket-based real-time notifications',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the flag is enabled',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({
    description: 'Targeting strategy',
    enum: TargetingStrategy,
    example: TargetingStrategy.ENABLED_FOR_PERCENTAGE,
    required: false,
  })
  @IsEnum(TargetingStrategy)
  @IsOptional()
  strategy?: TargetingStrategy;

  @ApiProperty({
    description: 'Percentage of users to enable (0-100)',
    example: 50,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  percentage?: number;

  @ApiProperty({
    description: 'Array of user IDs to enable',
    example: ['user-123', 'user-456'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userIds?: string[];

  @ApiProperty({
    description: 'Array of roles to enable',
    enum: UserRole,
    isArray: true,
    example: [UserRole.ADMIN],
    required: false,
  })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  @IsOptional()
  roles?: UserRole[];
}

export class FeatureFlagResponseDto {
  @ApiProperty({
    description: 'Unique name of the feature flag',
    example: 'websocket_notifications',
  })
  name: string;

  @ApiProperty({
    description: 'Description of the feature flag',
    example: 'Enable WebSocket-based real-time notifications',
  })
  description?: string;

  @ApiProperty({
    description: 'Whether the flag is enabled',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'Targeting strategy',
    enum: TargetingStrategy,
    example: TargetingStrategy.ENABLED_FOR_PERCENTAGE,
  })
  strategy: TargetingStrategy;

  @ApiProperty({
    description: 'Percentage of users to enable (0-100)',
    example: 25,
  })
  percentage?: number;

  @ApiProperty({
    description: 'Array of user IDs to enable',
    example: ['user-123', 'user-456'],
  })
  userIds?: string[];

  @ApiProperty({
    description: 'Array of roles to enable',
    enum: UserRole,
    isArray: true,
    example: [UserRole.ADMIN],
  })
  roles?: UserRole[];

  @ApiProperty({
    description: 'When the flag was created',
    example: '2026-04-23T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the flag was last updated',
    example: '2026-04-23T10:30:00Z',
  })
  updatedAt: Date;
}
