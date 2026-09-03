import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BackendErrorMonitoringFilter } from './backend-error-monitoring.filter';
import * as monitoring from '../monitoring/error-monitoring';

describe('BackendErrorMonitoringFilter', () => {
  let filter: BackendErrorMonitoringFilter;
  let response: { status: jest.Mock; json: jest.Mock };
  let request: any;
  let loggerErrorSpy: jest.SpyInstance;
  let captureErrorSpy: jest.SpyInstance;
  let isMonitoringEnabledSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new BackendErrorMonitoringFilter();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    request = {
      method: 'POST',
      originalUrl: '/api/auth/social-login',
      url: '/api/auth/social-login',
      headers: {
        authorization: 'Bearer secret-token',
        cookie: 'session=secret-cookie',
        'x-request-id': 'req-123',
      },
      body: {
        password: 'secret-password',
      },
      user: {
        id: 'user-123',
        email: 'member@example.com',
      },
      startTime: Date.now() - 25,
    };
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    captureErrorSpy = jest
      .spyOn(monitoring, 'captureError')
      .mockImplementation(() => undefined);
    isMonitoringEnabledSpy = jest
      .spyOn(monitoring, 'isErrorMonitoringEnabled')
      .mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs safe context and preserves HttpException responses', () => {
    const exception = new HttpException(
      { statusCode: 400, message: 'Invalid token' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, createHost(request, response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Invalid token',
    });
    const logContext = JSON.parse(loggerErrorSpy.mock.calls[0][0]);
    expect(logContext).toEqual(
      expect.objectContaining({
        service: 'paz-church-backend',
        request_id: 'req-123',
        method: 'POST',
        path: '/api/auth/social-login',
        status_code: 400,
        error_type: 'HttpException',
        error_message: 'Invalid token',
        user_id: 'user-123',
        request_body: {
          password: '[REDACTED]',
        },
        response_body: {
          statusCode: 400,
          message: 'Invalid token',
        },
      }),
    );
    expect(JSON.stringify(logContext)).not.toContain('secret-token');
    expect(JSON.stringify(logContext)).not.toContain('secret-cookie');
    expect(JSON.stringify(logContext)).not.toContain('secret-password');
    expect(JSON.stringify(logContext)).not.toContain('member@example.com');
  });

  it('normalizes string HttpException responses', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, createHost(request, response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 403,
      message: 'Forbidden',
    });
  });

  it('logs unknown errors as 500 responses', () => {
    const exception = new Error('Database unavailable');

    filter.catch(exception, createHost(request, response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
    expect(JSON.parse(loggerErrorSpy.mock.calls[0][0])).toEqual(
      expect.objectContaining({
        status_code: 500,
        error_type: 'Error',
        error_message: 'Database unavailable',
        response_body: {
          statusCode: 500,
          message: 'Internal server error',
        },
      }),
    );
  });

  it('captures errors in Sentry-compatible monitoring when enabled', () => {
    const exception = new Error('Dependency failed', {
      cause: new Error('Connection refused'),
    });
    isMonitoringEnabledSpy.mockReturnValue(true);

    filter.catch(exception, createHost(request, response));

    expect(captureErrorSpy).toHaveBeenCalledWith(
      exception,
      expect.any(Function),
    );
    expect(JSON.parse(loggerErrorSpy.mock.calls[0][0])).toEqual(
      expect.objectContaining({
        cause_type: 'Error',
        cause_message: 'Connection refused',
      }),
    );
  });

  it('does not send events to monitoring when disabled', () => {
    filter.catch(new Error('Local error'), createHost(request, response));

    expect(captureErrorSpy).not.toHaveBeenCalled();
  });
});

function createHost(request: any, response: any): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;
}
