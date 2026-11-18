import type { Request, Response, NextFunction, RequestHandler } from "express";

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

interface BucketEntry {
  timestamps: number[];
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, BucketEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const clientKey = `${req.ip || "unknown"}:${req.path}`;
    const existing = buckets.get(clientKey) ?? { timestamps: [] };

    const cutoff = now - options.windowMs;
    const activeTimestamps = existing.timestamps.filter((ts) => ts > cutoff);

    if (activeTimestamps.length >= options.maxRequests) {
      res.status(429).json({
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please wait and try again.",
        },
      });
      return;
    }

    activeTimestamps.push(now);
    buckets.set(clientKey, { timestamps: activeTimestamps });
    next();
  };
}
