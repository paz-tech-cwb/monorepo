import * as Sentry from '@sentry/node';

const DEFAULT_TRACES_SAMPLE_RATE = 0;

let initialized = false;

export function initializeErrorMonitoring() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn || initialized) {
    return;
  }

  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE,
    serverName: process.env.SENTRY_SERVER_NAME || 'paz-church-backend',
    sendDefaultPii: false,
    tracesSampleRate: Number(
      process.env.SENTRY_TRACES_SAMPLE_RATE ?? DEFAULT_TRACES_SAMPLE_RATE,
    ),
    beforeSend(event) {
      if (event.request) {
        event.request = {
          method: event.request.method,
          url: event.request.url,
        };
      }

      return event;
    },
  });

  initialized = true;
}

export function isErrorMonitoringEnabled() {
  return initialized;
}

export function captureError(
  error: Error,
  configureScope: (scope: Sentry.Scope) => void,
) {
  Sentry.withScope((scope) => {
    configureScope(scope);
    Sentry.captureException(error);
  });
}

export { Sentry };
