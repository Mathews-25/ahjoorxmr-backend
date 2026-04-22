import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Interceptor to log slow requests
 * Logs a warning for any request that exceeds the configured threshold
 */
@Injectable()
export class SlowRequestInterceptor implements NestInterceptor {
  private readonly logger = new Logger('SlowRequest');
  private readonly threshold: number;

  constructor(private readonly configService: ConfigService) {
    this.threshold = parseInt(
      this.configService.get<string>('SLOW_REQUEST_THRESHOLD_MS', '2000'),
      10,
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, url, user } = request as any;

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startTime;

        if (durationMs > this.threshold) {
          this.logger.warn({
            message: 'Slow request detected',
            route: url,
            method,
            durationMs,
            threshold: this.threshold,
            userId: user?.id || 'anonymous',
            userAgent: request.get('user-agent'),
            ip: request.ip,
          });
        }
      }),
    );
  }
}
