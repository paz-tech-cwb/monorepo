import { QueryScope } from './scope.js';

export function auditQuery(operation: string, scope: QueryScope, details: Record<string, unknown> = {}): void {
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    operation,
    project: scope.alias,
    environment: scope.environment,
    range: scope.range,
    ...details,
  }));
}
