export class BridgeHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function unauthorized(message = 'Unauthorized'): BridgeHttpError {
  return new BridgeHttpError(401, 'unauthorized', message);
}

export function forbidden(message: string): BridgeHttpError {
  return new BridgeHttpError(403, 'forbidden', message);
}

export function badRequest(message: string): BridgeHttpError {
  return new BridgeHttpError(400, 'bad_request', message);
}

export function tooManyRequests(message = 'Rate limit exceeded'): BridgeHttpError {
  return new BridgeHttpError(429, 'rate_limited', message);
}
