import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

/**
 * Interceptor to enforce request timeouts
 * Aborts requests that exceed the configured timeout and returns 503 Service Unavailable
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.timeoutMs = parseInt(
      this.configService.get<string>('REQUEST_TIMEOUT_MS', '10000'),
      10,
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          this.logger.error({
            message: 'Request timeout',
            method,
            url,
            timeout: `${this.timeoutMs}ms`,
            userId: request.user?.id,
          });

          return throwError(
            () =>
              new RequestTimeoutException(
                `Request exceeded timeout of ${this.timeoutMs}ms`,
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
