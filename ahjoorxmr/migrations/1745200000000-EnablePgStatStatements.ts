import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to enable pg_stat_statements extension for query performance monitoring
 * This extension tracks execution statistics of all SQL statements executed by the server
 */
export class EnablePgStatStatements1745200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pg_stat_statements extension
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS pg_stat_statements`,
    );

    // Reset statistics to start fresh
    await queryRunner.query(`SELECT pg_stat_statements_reset()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the extension
    await queryRunner.query(`DROP EXTENSION IF EXISTS pg_stat_statements`);
  }
}
