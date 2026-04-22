import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueryAnalysis } from '../entities/query-analysis.entity';
import { SlowQueryDto } from '../dto/slow-query.dto';
import { NotificationService } from '../../notification/notifications.service';
import { NotificationType } from '../../notification/notification-type.enum';
import * as crypto from 'crypto';

/**
 * Service for monitoring and analyzing database query performance
 * Tracks slow queries using pg_stat_statements and performs periodic analysis
 */
@Injectable()
export class QueryPerformanceService {
  private readonly logger = new Logger(QueryPerformanceService.name);
  private previousTopQueries: Set<string> = new Set();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(QueryAnalysis)
    private readonly queryAnalysisRepo: Repository<QueryAnalysis>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Get the top N slowest queries from pg_stat_statements
   */
  async getSlowQueries(limit: number = 20): Promise<SlowQueryDto[]> {
    try {
      const result = await this.dataSource.query(
        `
        SELECT 
          md5(query) as query_hash,
          query as query_text,
          mean_exec_time,
          calls,
          total_exec_time,
          min_exec_time,
          max_exec_time,
          stddev_exec_time
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
          AND query NOT LIKE '%pg_catalog%'
        ORDER BY mean_exec_time DESC
        LIMIT $1
        `,
        [limit],
      );

      return result.map((row: any) => ({
        query_hash: row.query_hash,
        query_text: row.query_text,
        mean_exec_time: parseFloat(row.mean_exec_time),
        calls: parseInt(row.calls, 10),
        total_exec_time: parseFloat(row.total_exec_time),
        min_exec_time: parseFloat(row.min_exec_time),
        max_exec_time: parseFloat(row.max_exec_time),
        stddev_exec_time: parseFloat(row.stddev_exec_time),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch slow queries: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Capture EXPLAIN ANALYZE for a specific query
   */
  private async captureExplainPlan(queryText: string): Promise<any> {
    try {
      // Extract the actual query without parameters
      // For safety, we'll only EXPLAIN SELECT queries
      if (!queryText.trim().toUpperCase().startsWith('SELECT')) {
        this.logger.warn(
          `Skipping EXPLAIN for non-SELECT query: ${queryText.substring(0, 50)}...`,
        );
        return null;
      }

      // Replace parameter placeholders with sample values for EXPLAIN
      // This is a simplified approach - in production, you might want more sophisticated parameter handling
      const explainableQuery = queryText.replace(/\$\d+/g, 'NULL');

      const result = await this.dataSource.query(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${explainableQuery}`,
      );

      return result[0]['QUERY PLAN'];
    } catch (error) {
      this.logger.warn(
        `Failed to capture EXPLAIN plan: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Scheduled task to analyze top 5 slowest queries every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async analyzeSlowQueries(): Promise<void> {
    this.logger.log('Starting scheduled query performance analysis...');

    try {
      const topQueries = await this.getSlowQueries(5);

      if (topQueries.length === 0) {
        this.logger.log('No slow queries found');
        return;
      }

      const currentTopQueries = new Set<string>();

      for (const query of topQueries) {
        currentTopQueries.add(query.query_hash);

        // Capture EXPLAIN plan
        const explainPlan = await this.captureExplainPlan(query.query_text);

        if (explainPlan) {
          // Store the analysis
          const analysis = this.queryAnalysisRepo.create({
            query_hash: query.query_hash,
            query_text: query.query_text,
            mean_exec_time: query.mean_exec_time,
            calls: query.calls,
            total_exec_time: query.total_exec_time,
            explain_plan: explainPlan,
            captured_at: new Date(),
          });

          await this.queryAnalysisRepo.save(analysis);

          this.logger.log(
            `Captured analysis for query ${query.query_hash} (mean: ${query.mean_exec_time}ms)`,
          );
        }

        // Check if this is a new entry in top 5
        if (!this.previousTopQueries.has(query.query_hash)) {
          await this.alertNewSlowQuery(query);
        }
      }

      // Update the previous top queries set
      this.previousTopQueries = currentTopQueries;

      this.logger.log(
        `Completed query performance analysis. Analyzed ${topQueries.length} queries.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to analyze slow queries: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Send alert when a new query enters the top 5 slowest list
   */
  private async alertNewSlowQuery(query: SlowQueryDto): Promise<void> {
    try {
      this.logger.warn(
        `New slow query detected: ${query.query_hash} (mean: ${query.mean_exec_time}ms, calls: ${query.calls})`,
      );

      // Create a notification for admins
      // Note: This assumes you have admin users in your system
      // You might want to adjust this based on your notification system
      const message =
        `New slow query detected:\n` +
        `Mean execution time: ${query.mean_exec_time.toFixed(2)}ms\n` +
        `Calls: ${query.calls}\n` +
        `Query: ${query.query_text.substring(0, 100)}...`;

      // Send notification to admin users
      // This is a placeholder - adjust based on your notification system
      await this.notificationService.createNotification({
        userId: null, // System notification
        type: NotificationType.SYSTEM_ALERT,
        title: 'New Slow Query Detected',
        message,
        metadata: {
          query_hash: query.query_hash,
          mean_exec_time: query.mean_exec_time,
          calls: query.calls,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send slow query alert: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get historical query analysis data
   */
  async getQueryAnalysisHistory(
    queryHash?: string,
    limit: number = 100,
  ): Promise<QueryAnalysis[]> {
    const queryBuilder = this.queryAnalysisRepo
      .createQueryBuilder('qa')
      .orderBy('qa.captured_at', 'DESC')
      .take(limit);

    if (queryHash) {
      queryBuilder.where('qa.query_hash = :queryHash', { queryHash });
    }

    return queryBuilder.getMany();
  }

  /**
   * Reset pg_stat_statements statistics
   * Use with caution - this clears all collected statistics
   */
  async resetStatistics(): Promise<void> {
    try {
      await this.dataSource.query('SELECT pg_stat_statements_reset()');
      this.logger.log('pg_stat_statements statistics reset');
    } catch (error) {
      this.logger.error(
        `Failed to reset statistics: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
