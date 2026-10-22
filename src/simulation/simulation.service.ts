import {
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RateLimitResult } from './types/rate-limit.types';
import { ScenarioState } from './types/scenario-state.type';
import { ScenarioStep, StoredScenarioStep } from './types/scenario-step.type';

const DEFAULT_RATE_LIMIT_ID = 'default-rate-limit';
const SIMULATION_INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
const SIMULATION_CLEANUP_INTERVAL_MS = 60 * 1000;

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
export class SimulationService implements OnModuleInit, OnModuleDestroy {
  private cleanupInterval: ReturnType<typeof setInterval> | undefined;
  onModuleInit() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSimulations();
    }, SIMULATION_CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval !== undefined) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
  private readonly rateLimitConfig = new Map<string, RateLimitConfig>([
    [
      DEFAULT_RATE_LIMIT_ID,
      { limit: 5, windowSeconds: 10, lastActivity: Date.now() },
    ],
  ]);
  private readonly rateLimitState = new Map<string, RateLimitState>();

  private readonly scenarioStates = new Map<string, ScenarioState>();

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

  createScenario(steps: ScenarioStep[]): string {
    const id = randomUUID();
    const readyToSaveSteps: StoredScenarioStep[] = steps.map((step) => {
      if (step.type === 'rate-limit') {
        const id = this.createRateLimitSimulation(
          step.limit,
          step.windowSeconds,
        ).id;
        return { ...step, configId: id };
      }
      return step;
    });

    const scenarioState: ScenarioState = {
      id,
      steps: readyToSaveSteps,
      currentStepIndex: 0,
      currentStepCount: 0,
    };
    this.scenarioStates.set(id, scenarioState);
    return id;
  }

  getNextStep(id: string) {
    const scenario = this.scenarioStates.get(id);
    if (!scenario) {
      throw new NotFoundException(`Scenario with id ${id} not found`);
    }
    const currentStep = scenario.steps[scenario.currentStepIndex];
    scenario.currentStepCount += 1;
    if (scenario.currentStepCount >= currentStep.times) {
      if (scenario.currentStepIndex < scenario.steps.length - 1) {
        scenario.currentStepIndex += 1;
        scenario.currentStepCount = 0;
      }
    }
    return currentStep;
  }
}
