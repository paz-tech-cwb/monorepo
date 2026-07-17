import { BridgeConfig, durationToMs, ProjectConfig } from './config.js';
import { badRequest, forbidden } from './errors.js';

export interface QueryScope {
  alias: string;
  environment: string;
  range: string;
  since: string;
  project: ProjectConfig;
}

export function resolveScope(config: BridgeConfig, query: Record<string, unknown>): QueryScope {
  const alias = asString(query.project);
  if (!alias) {
    throw badRequest('project is required');
  }

  const project = config.projects[alias];
  if (!project) {
    throw forbidden('Project is not allowlisted');
  }

  const environment = asString(query.environment) ?? project.defaultEnvironment;
  if (!environment) {
    throw badRequest('environment is required');
  }

  if (!project.allowedEnvironments.includes(environment)) {
    throw forbidden('Environment is not allowlisted for this project');
  }

  const range = asString(query.range) ?? project.defaultRange ?? config.defaults.range;
  const maxRange = project.maxRange ?? config.defaults.maxRange;

  if (durationToMs(range) > durationToMs(maxRange)) {
    throw badRequest(`range must be less than or equal to ${maxRange}`);
  }

  return {
    alias,
    environment,
    range,
    since: new Date(Date.now() - durationToMs(range)).toISOString(),
    project,
  };
}

export function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
