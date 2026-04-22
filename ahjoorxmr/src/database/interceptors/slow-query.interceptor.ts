import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

/**
 * Custom QueryRunner wrapper to log slow queries
 * This is injected into TypeORM's connection to monitor query execution times
 */
@Injectable()
export class SlowQueryLogger {
  private readonly logger = new Logger('SlowQuery');
  private readonly threshold: number;

  constructor(private readonly configService: ConfigService) {
    this.threshold = parseInt(
      this.configService.get<string>('DB_SLOW_QUERY_THRESHOLD_MS', '500'),
      10,
    );
  }

  /**
   * Wrap the DataSource to intercept query execution
   */
  wrapDataSource(dataSource: DataSource): void {
    const originalQuery = dataSource.query.bind(dataSource);

    dataSource.query = async function (
      query: string,
      parameters?: any[],
    ): Promise<any> {
      const startTime = Date.now();
      const callingMethod = SlowQueryLogger.getCallingMethod();

      try {
        const result = await originalQuery(query, parameters);
        const executionTime = Date.now() - startTime;

        if (executionTime > this.threshold) {
          this.logger.warn({
            message: 'Slow query detected',
            executionTime: `${executionTime}ms`,
            threshold: `${this.threshold}ms`,
            query: query.substring(0, 500), // Truncate long queries
            parameters: parameters ? JSON.stringify(parameters) : undefined,
            callingMethod,
          });
        }

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        this.logger.error({
          message: 'Query execution failed',
          executionTime: `${executionTime}ms`,
          query: query.substring(0, 500),
          parameters: parameters ? JSON.stringify(parameters) : undefined,
          callingMethod,
          error: (error as Error).message,
        });
        throw error;
      }
    }.bind(this);
  }

  /**
   * Get the calling method from the stack trace
   */
  private static getCallingMethod(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';

    const lines = stack.split('\n');
    // Skip the first few lines (Error, getCallingMethod, wrapDataSource, query wrapper)
    for (let i = 4; i < lines.length; i++) {
      const line = lines[i].trim();
      // Look for service or controller methods
      if (
        line.includes('.service.') ||
        line.includes('.controller.') ||
        line.includes('Service.') ||
        line.includes('Controller.')
      ) {
        // Extract method name
        const match = line.match(/at (\w+\.\w+)/);
        return match ? match[1] : line.substring(0, 100);
      }
    }

    return 'unknown';
  }
}
