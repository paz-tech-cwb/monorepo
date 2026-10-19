import { HttpStatus } from '@nestjs/common';

/**
 * Body of an HttpException that carries a stable, machine-readable `code`
 * next to the human `message`. Clients branch on `code` (never on `message`,
 * which is free text and may be reworded). Same shape the meetings API already
 * used inline (`statusCode`, `error`, `code`, `message`).
 *
 * A response WITHOUT `code` on a 404 is not an application error at all: it is
 * Nest's generic "Cannot GET /api/..." for a route the running build does not
 * have (e.g. a deploy that did not land).
 */
export interface CodedErrorBody {
  statusCode: number;
  error: string;
  code: string;
  message: string;
}

export function codedErrorBody(
  status: HttpStatus,
  code: string,
  message: string,
): CodedErrorBody {
  return {
    statusCode: status,
    error: HttpStatus[status]
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' '),
    code,
    message,
  };
}
