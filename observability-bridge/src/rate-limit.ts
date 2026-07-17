import { NextFunction, Request, Response } from 'express';
import { tooManyRequests } from './errors.js';

interface Bucket {
  resetAt: number;
  count: number;
}

export function createRateLimiter(options: { windowMs: number; maxRequests: number }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, _res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { resetAt: now + options.windowMs, count: 1 });
      next();
      return;
    }

    if (bucket.count >= options.maxRequests) {
      next(tooManyRequests());
      return;
    }

    bucket.count += 1;
    next();
  };
}
