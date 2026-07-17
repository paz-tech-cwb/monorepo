import { readFileSync } from 'node:fs';
import { z } from 'zod';

const durationSchema = z.string().regex(/^\d+[hm]$/, 'Use a duration like 30m, 1h, or 24h');

const projectSchema = z.object({
  organizationSlug: z.string().min(1),
  projectSlug: z.string().min(1),
  defaultEnvironment: z.string().min(1).optional(),
  allowedEnvironments: z.array(z.string().min(1)).min(1),
  defaultRange: durationSchema.optional(),
  maxRange: durationSchema.optional(),
});

export const bridgeConfigSchema = z.object({
  defaults: z.object({
    range: durationSchema.default('1h'),
    maxRange: durationSchema.default('24h'),
    rateLimit: z.object({
      windowMs: z.number().int().positive().default(60_000),
      maxRequests: z.number().int().positive().default(60),
    }).default({ windowMs: 60_000, maxRequests: 60 }),
  }).default({ range: '1h', maxRange: '24h', rateLimit: { windowMs: 60_000, maxRequests: 60 } }),
  projects: z.record(z.string().min(1), projectSchema).refine((projects) => Object.keys(projects).length > 0, 'At least one project must be configured'),
});

export type BridgeConfig = z.infer<typeof bridgeConfigSchema>;
export type ProjectConfig = BridgeConfig['projects'][string];

export interface RuntimeConfig {
  port: number;
  bridgeToken: string;
  glitchtipBaseUrl: string;
  glitchtipToken: string;
  glitchtipAuthScheme: 'Bearer' | 'Token';
  config: BridgeConfig;
}

export function loadBridgeConfig(path = process.env.OBSERVABILITY_BRIDGE_CONFIG ?? 'config.json'): BridgeConfig {
  const raw = readFileSync(path, 'utf8');
  return bridgeConfigSchema.parse(JSON.parse(raw));
}

export function loadRuntimeConfig(): RuntimeConfig {
  const bridgeToken = process.env.OBSERVABILITY_BRIDGE_TOKEN;
  const glitchtipToken = process.env.GLITCHTIP_API_TOKEN;
  const glitchtipAuthScheme = parseGlitchtipAuthScheme(process.env.GLITCHTIP_AUTH_SCHEME);

  if (!bridgeToken) {
    throw new Error('OBSERVABILITY_BRIDGE_TOKEN is required');
  }

  if (!glitchtipToken) {
    throw new Error('GLITCHTIP_API_TOKEN is required');
  }

  return {
    port: Number(process.env.PORT ?? 3015),
    bridgeToken,
    glitchtipToken,
    glitchtipAuthScheme,
    glitchtipBaseUrl: process.env.GLITCHTIP_BASE_URL ?? 'https://app.glitchtip.com/api/0',
    config: loadBridgeConfig(),
  };
}

function parseGlitchtipAuthScheme(value: string | undefined): 'Bearer' | 'Token' {
  if (!value) {
    return 'Bearer';
  }

  if (value === 'Bearer' || value === 'Token') {
    return value;
  }

  throw new Error('GLITCHTIP_AUTH_SCHEME must be Bearer or Token');
}

export function durationToMs(duration: string): number {
  const amount = Number(duration.slice(0, -1));
  const unit = duration.at(-1);

  return unit === 'h' ? amount * 60 * 60 * 1000 : amount * 60 * 1000;
}
