export type RateLimitResult =
  | { outcome: 'allowed' }
  | { outcome: 'rate-limited'; retryAfterSeconds: number }
  | { outcome: 'not-found' };