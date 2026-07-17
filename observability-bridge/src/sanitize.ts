const sensitiveKeyPattern = /(authorization|auth|token|secret|password|passwd|cookie|set-cookie|api[-_]?key|cpf|payment|card|email|phone|name|first[-_]?name|last[-_]?name|body|request[-_]?body|response[-_]?body|headers?|raw|payload)/i;
const sensitiveValuePattern = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\+?\d[\d\s().-]{7,}\d\b|\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b)/gi;
const maxStringLength = 1_000;
const maxArrayLength = 25;
const maxObjectKeys = 40;

export function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return '[Truncated]';
  }

  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, maxArrayLength).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, maxObjectKeys);
    const sanitized: Record<string, unknown> = {};

    for (const [key, child] of entries) {
      if (sensitiveKeyPattern.test(key)) {
        continue;
      }

      sanitized[key] = sanitizeValue(child, depth + 1);
    }

    return sanitized;
  }

  return undefined;
}

export function sanitizeString(value: string): string {
  const withoutSensitiveValues = value.replace(sensitiveValuePattern, '[Redacted]');
  return withoutSensitiveValues.length > maxStringLength
    ? `${withoutSensitiveValues.slice(0, maxStringLength)}…[Truncated]`
    : withoutSensitiveValues;
}

export function sanitizeIssue(issue: Record<string, unknown>): Record<string, unknown> {
  return sanitizeValue({
    id: issue.id,
    shortId: issue.shortId,
    title: issue.title,
    count: issue.count,
    userCount: issue.userCount,
    firstSeen: issue.firstSeen,
    lastSeen: issue.lastSeen,
    status: issue.status,
    culprit: issue.culprit,
    permalink: issue.permalink,
    metadata: issue.metadata,
    tags: issue.tags,
    project: issue.project,
  }) as Record<string, unknown>;
}

export function sanitizeEventSummary(event: Record<string, unknown>): Record<string, unknown> {
  return sanitizeValue({
    id: event.id,
    eventID: event.eventID,
    title: event.title,
    message: event.message,
    culprit: event.culprit,
    dateCreated: event.dateCreated,
    release: readTag(event, 'release'),
    environment: readTag(event, 'environment'),
    transaction: readTag(event, 'transaction'),
    statusCode: readTag(event, 'status_code') ?? readTag(event, 'http.status_code'),
  }) as Record<string, unknown>;
}

export function sanitizeStack(event: Record<string, unknown>): Record<string, unknown> {
  const entries = Array.isArray(event.entries) ? event.entries as Array<Record<string, unknown>> : [];
  const exceptionEntry = entries.find((entry) => entry.type === 'exception');
  const values = getNestedArray(exceptionEntry, ['data', 'values']);
  const frames = getNestedArray(values.at(0), ['stacktrace', 'frames']);

  return sanitizeValue({
    eventId: event.eventID ?? event.id,
    title: event.title,
    frames: frames.slice(-20).map((frame) => ({
      filename: frame.filename,
      function: frame.function,
      module: frame.module,
      lineNo: frame.lineNo ?? frame.lineno,
      colNo: frame.colNo ?? frame.colno,
      contextLine: frame.contextLine ?? frame.context_line,
    })),
  }) as Record<string, unknown>;
}

function readTag(event: Record<string, unknown>, key: string): unknown {
  const tags = event.tags;
  if (!Array.isArray(tags)) {
    return undefined;
  }

  const tag = tags.find((item) => Array.isArray(item) && item[0] === key);
  return Array.isArray(tag) ? tag[1] : undefined;
}

function getNestedArray(value: unknown, path: string[]): Array<Record<string, unknown>> {
  let current = value;

  for (const part of path) {
    if (!current || typeof current !== 'object') {
      return [];
    }

    current = (current as Record<string, unknown>)[part];
  }

  return Array.isArray(current) ? current as Array<Record<string, unknown>> : [];
}
