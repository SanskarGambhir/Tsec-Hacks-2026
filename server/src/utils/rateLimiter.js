import { ApiError } from "./api-error.js";

/**
 * In-memory fixed-window rate limiter.
 *
 * Deliberately dependency-free and per-process. That is sufficient for a
 * single-instance deployment; behind multiple instances swap the Map for a
 * shared store (Redis) without changing the call sites.
 */

const buckets = new Map();

// Drop expired buckets periodically so the Map cannot grow without bound.
const SWEEP_INTERVAL = 5 * 60 * 1000;
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, SWEEP_INTERVAL);
sweeper.unref?.();

/**
 * @param {object}   options
 * @param {number}   options.windowMs  Length of the window.
 * @param {number}   options.max       Requests allowed per window.
 * @param {string}   options.name      Bucket namespace, keeps limiters isolated.
 * @param {Function} [options.keyOn]   Derives the identity to limit on.
 *                                     Defaults to the caller's IP.
 */
export const rateLimit = ({ windowMs, max, name, keyOn }) => {
  return (req, res, next) => {
    const identity = keyOn ? keyOn(req) : req.ip;
    // A request with no derivable identity is not limited but is also not
    // trusted — the route's own auth check still applies.
    if (!identity) return next();

    const key = `${name}:${identity}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      throw new ApiError(
        429,
        `Too many requests. Please try again in ${retryAfter} seconds.`
      );
    }

    return next();
  };
};

/** Strict limiter for credential and OTP endpoints. */
export const authLimiter = rateLimit({
  name: "auth",
  windowMs: 15 * 60 * 1000,
  max: 10,
});

/** Very strict — each call costs real money (SMS / WhatsApp). */
export const otpLimiter = rateLimit({
  name: "otp",
  windowMs: 60 * 60 * 1000,
  max: 5,
});

/** Guards spend-side endpoints against replay storms. */
export const paymentLimiter = rateLimit({
  name: "payment",
  windowMs: 60 * 1000,
  max: 20,
  keyOn: (req) => req.user?._id?.toString() || req.ip,
});

/** Third-party AI calls are billed per request. */
export const aiLimiter = rateLimit({
  name: "ai",
  windowMs: 60 * 1000,
  max: 10,
  keyOn: (req) => req.user?._id?.toString() || req.ip,
});

/** Broad ceiling applied to the whole API. */
export const globalLimiter = rateLimit({
  name: "global",
  windowMs: 60 * 1000,
  max: 300,
});
