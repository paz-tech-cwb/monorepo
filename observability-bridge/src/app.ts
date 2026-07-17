import express, { NextFunction, Request, Response } from 'express';
import { RuntimeConfig } from './config.js';
import { GlitchtipClient } from './glitchtip-client.js';
import { auditQuery } from './audit.js';
import { createRateLimiter } from './rate-limit.js';
import { asString, resolveScope } from './scope.js';
import { badRequest, BridgeHttpError, unauthorized } from './errors.js';

export interface ObservabilityClient {
  listTopErrors(params: Parameters<GlitchtipClient['listTopErrors']>[0]): ReturnType<GlitchtipClient['listTopErrors']>;
  listErrorsSinceRelease(params: Parameters<GlitchtipClient['listErrorsSinceRelease']>[0]): ReturnType<GlitchtipClient['listErrorsSinceRelease']>;
  findByRequestId(params: Parameters<GlitchtipClient['findByRequestId']>[0]): ReturnType<GlitchtipClient['findByRequestId']>;
  getIssueSummary(params: Parameters<GlitchtipClient['getIssueSummary']>[0]): ReturnType<GlitchtipClient['getIssueSummary']>;
  getRepresentativeStack(params: Parameters<GlitchtipClient['getRepresentativeStack']>[0]): ReturnType<GlitchtipClient['getRepresentativeStack']>;
}

export function createApp(runtime: RuntimeConfig, client: ObservabilityClient = new GlitchtipClient({ baseUrl: runtime.glitchtipBaseUrl, token: runtime.glitchtipToken })) {
  const app = express();

  app.disable('x-powered-by');
  app.use(createRateLimiter(runtime.config.defaults.rateLimit));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((req, _res, next) => {
    const authorization = req.header('authorization');
    const expected = `Bearer ${runtime.bridgeToken}`;

    if (authorization !== expected) {
      next(unauthorized());
      return;
    }

    next();
  });

  app.get('/projects', (_req, res) => {
    res.json(Object.entries(runtime.config.projects).map(([alias, project]) => ({
      alias,
      allowedEnvironments: project.allowedEnvironments,
      defaultEnvironment: project.defaultEnvironment,
      defaultRange: project.defaultRange ?? runtime.config.defaults.range,
      maxRange: project.maxRange ?? runtime.config.defaults.maxRange,
    })));
  });

  app.get('/errors/top', asyncHandler(async (req, res) => {
    const scope = resolveScope(runtime.config, req.query);
    auditQuery('glitchtip_list_top_errors', scope);
    res.json(await client.listTopErrors({ project: scope.project, environment: scope.environment, since: scope.since }));
  }));

  app.get('/errors/new', asyncHandler(async (req, res) => {
    const scope = resolveScope(runtime.config, req.query);
    const release = asString(req.query.since_release);

    if (!release) {
      throw badRequest('since_release is required');
    }

    auditQuery('glitchtip_list_errors_since_release', scope, { sinceRelease: release });
    res.json(await client.listErrorsSinceRelease({ project: scope.project, environment: scope.environment, since: scope.since, release }));
  }));

  app.get('/errors/by-request-id', asyncHandler(async (req, res) => {
    const scope = resolveScope(runtime.config, req.query);
    const requestId = asString(req.query.request_id);

    if (!requestId) {
      throw badRequest('request_id is required');
    }

    auditQuery('glitchtip_find_by_request_id', scope);
    res.json(await client.findByRequestId({ project: scope.project, environment: scope.environment, since: scope.since, requestId }));
  }));

  app.get('/errors/:issueId/summary', asyncHandler(async (req, res) => {
    const scope = resolveScope(runtime.config, req.query);
    auditQuery('glitchtip_get_issue_summary', scope, { issueId: req.params.issueId });
    res.json(await client.getIssueSummary({ project: scope.project, environment: scope.environment, issueId: req.params.issueId }));
  }));

  app.get('/errors/:issueId/representative-stack', asyncHandler(async (req, res) => {
    const scope = resolveScope(runtime.config, req.query);
    auditQuery('glitchtip_get_representative_stack', scope, { issueId: req.params.issueId });
    res.json(await client.getRepresentativeStack({ project: scope.project, environment: scope.environment, issueId: req.params.issueId }));
  }));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof BridgeHttpError) {
      res.status(error.statusCode).json({ error: error.code, message: error.message });
      return;
    }

    console.error(error);
    res.status(502).json({ error: 'upstream_error', message: 'Unable to fetch sanitized observability data' });
  });

  return app;
}

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}
