import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { BridgeConfig, RuntimeConfig } from '../src/config.js';
import { GlitchtipClient } from '../src/glitchtip-client.js';
import { sanitizeValue } from '../src/sanitize.js';

const config: BridgeConfig = {
  defaults: {
    range: '1h',
    maxRange: '24h',
    rateLimit: { windowMs: 60_000, maxRequests: 100 },
  },
  projects: {
    'paz-church-BE-prod': {
      organizationSlug: 'paz-church',
      projectSlug: 'paz-church-BE-prod',
      defaultEnvironment: 'production',
      allowedEnvironments: ['production'],
      defaultRange: '1h',
      maxRange: '24h',
    },
    future: {
      organizationSlug: 'future-org',
      projectSlug: 'future-api',
      defaultEnvironment: 'staging',
      allowedEnvironments: ['staging', 'production'],
    },
  },
};

const runtime: RuntimeConfig = {
  port: 3015,
  bridgeToken: 'bridge-token',
  glitchtipBaseUrl: 'https://glitchtip.example/api/0',
  glitchtipToken: 'glitchtip-token',
  glitchtipAuthScheme: 'Bearer',
  config,
};

describe('observability bridge app', () => {
  it('requires the bridge token for protected routes', async () => {
    const app = createApp(runtime, fakeClient());
    const response = await request(app).get('/projects');

    expect(response.status).toBe(401);
  });

  it('rejects non-allowlisted projects before querying GlitchTip', async () => {
    const client = fakeClient();
    const app = createApp(runtime, client);
    const response = await request(app)
      .get('/errors/top?project=other&environment=production')
      .set('Authorization', 'Bearer bridge-token');

    expect(response.status).toBe(403);
    expect(client.listTopErrors).not.toHaveBeenCalled();
  });

  it('rejects non-allowlisted environments before querying GlitchTip', async () => {
    const client = fakeClient();
    const app = createApp(runtime, client);
    const response = await request(app)
      .get('/errors/top?project=paz-church-BE-prod&environment=staging')
      .set('Authorization', 'Bearer bridge-token');

    expect(response.status).toBe(403);
    expect(client.listTopErrors).not.toHaveBeenCalled();
  });

  it('rejects ranges above the configured max', async () => {
    const client = fakeClient();
    const app = createApp(runtime, client);
    const response = await request(app)
      .get('/errors/top?project=paz-church-BE-prod&environment=production&range=25h')
      .set('Authorization', 'Bearer bridge-token');

    expect(response.status).toBe(400);
    expect(client.listTopErrors).not.toHaveBeenCalled();
  });

  it('uses safe defaults and calls the top errors operation', async () => {
    const client = fakeClient();
    const app = createApp(runtime, client);
    const response = await request(app)
      .get('/errors/top?project=paz-church-BE-prod')
      .set('Authorization', 'Bearer bridge-token');

    expect(response.status).toBe(200);
    expect(client.listTopErrors).toHaveBeenCalledWith(expect.objectContaining({
      environment: 'production',
      project: expect.objectContaining({ projectSlug: 'paz-church-BE-prod' }),
    }));
  });
});

describe('sanitization', () => {
  it('removes sensitive fields and redacts common PII values', () => {
    const sanitized = sanitizeValue({
      title: 'Failure for person@example.com',
      requestBody: { password: 'secret', cpf: '123.456.789-10' },
      headers: { authorization: 'Bearer secret' },
      safe: 'endpoint /api/forms',
      userPhone: '+55 41 99999-9999',
    });

    expect(sanitized).toEqual({
      title: 'Failure for [Redacted]',
      safe: 'endpoint /api/forms',
    });
  });
});

describe('GlitchTip query formatting', () => {
  it('formats issue queries with project, environment, since, and query filters', () => {
    const client = new GlitchtipClient({ baseUrl: 'https://glitchtip.example/api/0/', token: 'server-token' });
    const url = client.issueUrl({
      project: config.projects['paz-church-BE-prod'],
      environment: 'production',
      since: '2026-07-16T18:00:00.000Z',
      query: 'release:"backend@1"',
    });

    expect(url).toContain('/projects/paz-church/paz-church-BE-prod/issues/?');
    expect(url).toContain('environment=production');
    expect(url).toContain('since=2026-07-16T18%3A00%3A00.000Z');
    expect(url).toContain('query=release%3A%22backend%401%22');
    expect(url).not.toContain('statsPeriod=');
  });
});

function fakeClient(): Pick<GlitchtipClient, 'listTopErrors' | 'listErrorsSinceRelease' | 'findByRequestId' | 'getIssueSummary' | 'getRepresentativeStack'> {
  return {
    listTopErrors: vi.fn().mockResolvedValue([]),
    listErrorsSinceRelease: vi.fn().mockResolvedValue([]),
    findByRequestId: vi.fn().mockResolvedValue([]),
    getIssueSummary: vi.fn().mockResolvedValue({}),
    getRepresentativeStack: vi.fn().mockResolvedValue({ frames: [] }),
  };
}
