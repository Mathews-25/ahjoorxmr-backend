import { ApiProperty } from '@nestjs/swagger';

export class SlowQueryDto {
  @ApiProperty({
    description: 'MD5 hash of the normalized query',
    example: 'a1b2c3d4e5f6...',
  })
  query_hash: string;

  @ApiProperty({
    description: 'Parameterized SQL query text',
    example: 'SELECT * FROM users WHERE id = $1',
  })
  query_text: string;

  @ApiProperty({
    description: 'Mean execution time in milliseconds',
    example: 1250.5,
  })
  mean_exec_time: number;

  @ApiProperty({
    description: 'Number of times this query was executed',
    example: 1500,
  })
  calls: number;

  @ApiProperty({
    description: 'Total execution time in milliseconds',
    example: 1875750.0,
  })
  total_exec_time: number;

  @ApiProperty({
    description: 'Minimum execution time in milliseconds',
    example: 50.2,
  })
  min_exec_time: number;

  @ApiProperty({
    description: 'Maximum execution time in milliseconds',
    example: 5000.8,
  })
  max_exec_time: number;

  @ApiProperty({
    description: 'Standard deviation of execution time',
    example: 250.3,
  })
  stddev_exec_time: number;
}

export class QueryAnalysisDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'MD5 hash of the normalized query',
    example: 'a1b2c3d4e5f6...',
  })
  query_hash: string;

  @ApiProperty({
    description: 'Parameterized SQL query text',
    example: 'SELECT * FROM users WHERE id = $1',
  })
  query_text: string;

  @ApiProperty({
    description: 'Mean execution time in milliseconds',
    example: 1250.5,
  })
  mean_exec_time: number;

  @ApiProperty({
    description: 'Number of times this query was executed',
    example: 1500,
  })
  calls: number;

  @ApiProperty({
    description: 'Total execution time in milliseconds',
    example: 1875750.0,
  })
  total_exec_time: number;

  @ApiProperty({
    description: 'EXPLAIN ANALYZE output in JSON format',
    example: { Plan: { 'Node Type': 'Seq Scan' } },
  })
  explain_plan: any;

  @ApiProperty({
    description: 'When this analysis was captured',
    example: '2026-04-23T10:30:00Z',
  })
  captured_at: Date;

  @ApiProperty({
    description: 'When this record was created',
    example: '2026-04-23T10:30:00Z',
  })
  created_at: Date;
}
