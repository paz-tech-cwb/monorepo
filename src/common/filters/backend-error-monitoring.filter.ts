import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  captureError,
  isErrorMonitoringEnabled,
} from '../monitoring/error-monitoring';

type RequestWithUser = Request & {
  user?: {
    id?: string | number;
    sub?: string | number;
  };
  startTime?: number;
};

type ErrorLogContext = {
  service: string;
  environment: string;
  timestamp: string;
  request_id?: string;
  method?: string;
  path?: string;
  status_code: number;
  duration_ms?: number;
  error_type: string;
  error_message: string;
  stack?: string;
  user_id?: string;
};

const CORRELATION_HEADERS = [
  'x-request-id',
  'x-correlation-id',
  'x-amzn-trace-id',
] as const;

@Catch()
export class BackendErrorMonitoringFilter implements ExceptionFilter {
  private readonly logger = new Logger(BackendErrorMonitoringFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithUser>();
    const response = context.getResponse<Response>();
    const statusCode = this.getStatusCode(exception);
    const responseBody = this.getResponseBody(exception, statusCode);
    const error = this.toError(exception);
    const logContext = this.buildLogContext(request, statusCode, error);

    this.logger.error(logContext);
    this.captureInErrorMonitoring(error, logContext);

    response.status(statusCode).json(responseBody);
  }

  private getStatusCode(exception: unknown) {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getResponseBody(exception: unknown, statusCode: number) {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        return exceptionResponse;
      }

      return {
        statusCode,
        message: exceptionResponse,
      };
    }

    return {
      statusCode,
      message: 'Internal server error',
    };
  }

  private toError(exception: unknown) {
    if (exception instanceof Error) {
      return exception;
    }

    return new Error(typeof exception === 'string' ? exception : 'Unknown error');
  }

  private buildLogContext(
    request: RequestWithUser,
    statusCode: number,
    error: Error,
  ): ErrorLogContext {
    return {
      service: 'paz-church-backend',
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      request_id: this.getCorrelationId(request),
      method: request.method,
      path: request.originalUrl || request.url,
      status_code: statusCode,
      duration_ms: this.getDurationMs(request),
      error_type: error.name,
      error_message: error.message,
      stack: this.sanitizeStack(error.stack),
      user_id: this.getUserId(request),
    };
  }

  private getCorrelationId(request: Request) {
    for (const headerName of CORRELATION_HEADERS) {
      const value = request.headers[headerName];

      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return undefined;
  }

  private getDurationMs(request: RequestWithUser) {
    if (!request.startTime) {
      return undefined;
    }

    return Date.now() - request.startTime;
  }

  private getUserId(request: RequestWithUser) {
    const userId = request.user?.id ?? request.user?.sub;

    return userId === undefined ? undefined : String(userId);
  }

  private sanitizeStack(stack?: string) {
    if (!stack) {
      return undefined;
    }

    return stack.split('\n').slice(0, 20).join('\n');
  }

  private captureInErrorMonitoring(error: Error, context: ErrorLogContext) {
    if (!isErrorMonitoringEnabled()) {
      return;
    }

    captureError(error, (scope) => {
      scope.setTag('project', 'paz-church');
      scope.setTag('service', context.service);
      scope.setTag('environment', context.environment);
      scope.setTag('status_code', String(context.status_code));

      if (context.method) {
        scope.setTag('method', context.method);
      }

      if (context.path) {
        scope.setTag('path', context.path);
      }

      if (context.request_id) {
        scope.setTag('request_id', context.request_id);
      }

      if (context.user_id) {
        scope.setUser({ id: context.user_id });
      }

      scope.setContext('request', {
        request_id: context.request_id,
        method: context.method,
        path: context.path,
        duration_ms: context.duration_ms,
      });
    });
  }
}
