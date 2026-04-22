import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

/**
 * Migration to create query_analysis table for storing EXPLAIN ANALYZE results
 */
export class CreateQueryAnalysisTable1745200000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'query_analysis',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'query_hash',
            type: 'varchar',
            length: '64',
            comment: 'MD5 hash of the normalized query',
          },
          {
            name: 'query_text',
            type: 'text',
            comment: 'Parameterized SQL query text',
          },
          {
            name: 'mean_exec_time',
            type: 'decimal',
            precision: 10,
            scale: 3,
            comment: 'Mean execution time in milliseconds',
          },
          {
            name: 'calls',
            type: 'bigint',
            comment: 'Number of times this query was executed',
          },
          {
            name: 'total_exec_time',
            type: 'decimal',
            precision: 15,
            scale: 3,
            comment: 'Total execution time in milliseconds',
          },
          {
            name: 'explain_plan',
            type: 'jsonb',
            comment: 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) output',
          },
          {
            name: 'captured_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            comment: 'When this analysis was captured',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for efficient querying
    await queryRunner.createIndex(
      'query_analysis',
      new Index({
        name: 'IDX_query_analysis_query_hash',
        columnNames: ['query_hash'],
      }),
    );

    await queryRunner.createIndex(
      'query_analysis',
      new Index({
        name: 'IDX_query_analysis_mean_exec_time',
        columnNames: ['mean_exec_time'],
      }),
    );

    await queryRunner.createIndex(
      'query_analysis',
      new Index({
        name: 'IDX_query_analysis_captured_at',
        columnNames: ['captured_at'],
      }),
    );

    // Enable uuid-ossp extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('query_analysis');
  }
}
