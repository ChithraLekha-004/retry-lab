import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RateLimitResult } from './types/rate-limit.types';

const DEFAULT_RATE_LIMIT_ID = 'default-rate-limit';
const SIMULATION_INACTIVITY_LIMIT_MS = 5 * 60 * 1000;

type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
  lastActivity: number;
};

type RateLimitState = {
  count: number;
  windowStart: number;
};

@Injectable()
export class SimulationService {
  private readonly rateLimitConfig = new Map<string, RateLimitConfig>([
    [
      DEFAULT_RATE_LIMIT_ID,
      { limit: 5, windowSeconds: 10, lastActivity: Date.now() },
    ],
  ]);
  private readonly rateLimitState = new Map<string, RateLimitState>();

  wait(delay: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, delay);
    });
  }

  createRateLimitSimulation(
    limit: number,
    windowSeconds: number,
  ): { id: string; limit: number; windowSeconds: number } {
    const id = randomUUID();
    this.rateLimitConfig.set(id, {
      limit,
      windowSeconds,
      lastActivity: Date.now(),
    });
    return { id, limit, windowSeconds };
  }

  checkRateLimit(id: string, now: number = Date.now()): RateLimitResult {
    const config = this.rateLimitConfig.get(id);
    if (!config) {
      return { outcome: 'not-found' };
    }
    config.lastActivity = now;
    const windowDurationMs = config.windowSeconds * 1000;
    const state = this.rateLimitState.get(id);
    const elapsedTime = state ? now - state.windowStart : 0;

    if (!state || elapsedTime >= windowDurationMs) {
      this.rateLimitState.set(id, { count: 1, windowStart: now });
      return { outcome: 'allowed' };
    }

    if (state.count < config.limit) {
      state.count += 1;
      return { outcome: 'allowed' };
    }

    const retryAfterSeconds = Math.ceil(
      config.windowSeconds - elapsedTime / 1000,
    );
    return { outcome: 'rate-limited', retryAfterSeconds };
  }

  checkDefaultRateLimit(): RateLimitResult {
    return this.checkRateLimit(DEFAULT_RATE_LIMIT_ID);
  }

  cleanupStaleSimulations(now: number = Date.now()): void {
    for (const [id, config] of this.rateLimitConfig) {
      if (id === DEFAULT_RATE_LIMIT_ID) continue;
      let staleTime = now - config.lastActivity;
      if (SIMULATION_INACTIVITY_LIMIT_MS <= staleTime) {
        this.rateLimitConfig.delete(id);
        this.rateLimitState.delete(id);
      }
    }
  }
}
