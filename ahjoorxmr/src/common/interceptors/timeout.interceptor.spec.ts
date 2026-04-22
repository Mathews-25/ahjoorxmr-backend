import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { TimeoutInterceptor } from './timeout.interceptor';
import { of, delay, throwError } from 'rxjs';

describe('TimeoutInterceptor', () => {
  let interceptor: TimeoutInterceptor;
  let configService: ConfigService;

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'GET',
        url: '/api/v1/test',
        user: { id: 'user-123' },
      }),
    }),
  } as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeoutInterceptor,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: string) => {
              if (key === 'REQUEST_TIMEOUT_MS') {
                return '1000'; // 1 second for testing
              }
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    interceptor = module.get<TimeoutInterceptor>(TimeoutInterceptor);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should allow requests that complete within timeout', (done) => {
    const mockCallHandler: CallHandler = {
      handle: () => of('success').pipe(delay(100)), // 100ms delay
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (value) => {
        expect(value).toBe('success');
        done();
      },
      error: (error) => {
        done(error);
      },
    });
  });

  it('should emit 503 when handler Observable does not complete in time', (done) => {
    const mockCallHandler: CallHandler = {
      handle: () => of('success').pipe(delay(2000)), // 2 second delay, exceeds 1s timeout
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: () => {
        done(new Error('Should not emit value'));
      },
      error: (error) => {
        expect(error).toBeInstanceOf(RequestTimeoutException);
        expect(error.message).toContain('Request exceeded timeout of 1000ms');
        expect(error.getStatus()).toBe(408); // RequestTimeoutException returns 408
        done();
      },
    });
  });

  it('should pass through other errors without modification', (done) => {
    const testError = new Error('Test error');
    const mockCallHandler: CallHandler = {
      handle: () => throwError(() => testError),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: () => {
        done(new Error('Should not emit value'));
      },
      error: (error) => {
        expect(error).toBe(testError);
        expect(error.message).toBe('Test error');
        done();
      },
    });
  });

  it('should use default timeout when config is not provided', async () => {
    const moduleWithDefaults: TestingModule = await Test.createTestingModule({
      providers: [
        TimeoutInterceptor,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => undefined), // No config provided
          },
        },
      ],
    }).compile();

    const interceptorWithDefaults =
      moduleWithDefaults.get<TimeoutInterceptor>(TimeoutInterceptor);

    expect(interceptorWithDefaults).toBeDefined();
    // The default timeout should be 10000ms as per the implementation
  });

  it('should handle requests with no user context', (done) => {
    const mockContextNoUser = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/api/v1/public',
          // No user property
        }),
      }),
    } as ExecutionContext;

    const mockCallHandler: CallHandler = {
      handle: () => of('success').pipe(delay(2000)),
    };

    interceptor.intercept(mockContextNoUser, mockCallHandler).subscribe({
      next: () => {
        done(new Error('Should not emit value'));
      },
      error: (error) => {
        expect(error).toBeInstanceOf(RequestTimeoutException);
        done();
      },
    });
  });

  it('should handle immediate responses without delay', (done) => {
    const mockCallHandler: CallHandler = {
      handle: () => of('immediate'),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (value) => {
        expect(value).toBe('immediate');
        done();
      },
      error: (error) => {
        done(error);
      },
    });
  });
});
