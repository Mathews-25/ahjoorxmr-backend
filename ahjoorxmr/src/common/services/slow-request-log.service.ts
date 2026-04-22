import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SlowRequestLogEntry {
  timestamp: string;
  route: string;
  method: string;
  durationMs: number;
  userId: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Service to manage slow request logs
 * Provides methods to read and query slow request log entries
 */
@Injectable()
export class SlowRequestLogService {
  private readonly logger = new Logger(SlowRequestLogService.name);
  private readonly logFilePath: string;

  constructor() {
    // Default log file path - can be made configurable
    this.logFilePath = path.join(process.cwd(), 'logs', 'slow-requests.jsonl');
  }

  /**
   * Get the last N slow request log entries
   */
  async getRecentSlowRequests(
    limit: number = 100,
  ): Promise<SlowRequestLogEntry[]> {
    try {
      // Ensure logs directory exists
      const logsDir = path.dirname(this.logFilePath);
      await fs.mkdir(logsDir, { recursive: true });

      // Check if log file exists
      try {
        await fs.access(this.logFilePath);
      } catch {
        // File doesn't exist yet
        return [];
      }

      // Read the log file
      const content = await fs.readFile(this.logFilePath, 'utf-8');
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);

      // Parse JSON lines and extract slow request entries
      const entries: SlowRequestLogEntry[] = [];

      for (const line of lines.slice(-limit * 2)) {
        // Read more lines to ensure we get enough slow requests
        try {
          const logEntry = JSON.parse(line);

          // Check if this is a slow request log entry
          if (
            logEntry.message === 'Slow request detected' &&
            logEntry.durationMs
          ) {
            entries.push({
              timestamp: logEntry.timestamp || new Date().toISOString(),
              route: logEntry.route,
              method: logEntry.method,
              durationMs: logEntry.durationMs,
              userId: logEntry.userId,
              userAgent: logEntry.userAgent,
              ip: logEntry.ip,
            });
          }
        } catch (error) {
          // Skip invalid JSON lines
          continue;
        }
      }

      // Return the last N entries
      return entries.slice(-limit);
    } catch (error) {
      this.logger.error(
        `Failed to read slow request logs: ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Get slow requests filtered by route pattern
   */
  async getSlowRequestsByRoute(
    routePattern: string,
    limit: number = 100,
  ): Promise<SlowRequestLogEntry[]> {
    const allEntries = await this.getRecentSlowRequests(limit * 2);
    return allEntries
      .filter((entry) => entry.route.includes(routePattern))
      .slice(-limit);
  }

  /**
   * Get slow requests for a specific user
   */
  async getSlowRequestsByUser(
    userId: string,
    limit: number = 100,
  ): Promise<SlowRequestLogEntry[]> {
    const allEntries = await this.getRecentSlowRequests(limit * 2);
    return allEntries.filter((entry) => entry.userId === userId).slice(-limit);
  }

  /**
   * Get statistics about slow requests
   */
  async getSlowRequestStats(): Promise<{
    totalCount: number;
    averageDuration: number;
    maxDuration: number;
    topRoutes: Array<{ route: string; count: number; avgDuration: number }>;
  }> {
    const entries = await this.getRecentSlowRequests(1000);

    if (entries.length === 0) {
      return {
        totalCount: 0,
        averageDuration: 0,
        maxDuration: 0,
        topRoutes: [],
      };
    }

    const totalDuration = entries.reduce((sum, e) => sum + e.durationMs, 0);
    const maxDuration = Math.max(...entries.map((e) => e.durationMs));

    // Calculate top routes
    const routeStats = new Map<
      string,
      { count: number; totalDuration: number }
    >();

    for (const entry of entries) {
      const existing = routeStats.get(entry.route) || {
        count: 0,
        totalDuration: 0,
      };
      routeStats.set(entry.route, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + entry.durationMs,
      });
    }

    const topRoutes = Array.from(routeStats.entries())
      .map(([route, stats]) => ({
        route,
        count: stats.count,
        avgDuration: Math.round(stats.totalDuration / stats.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCount: entries.length,
      averageDuration: Math.round(totalDuration / entries.length),
      maxDuration,
      topRoutes,
    };
  }
}
