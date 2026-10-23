import { NotFoundException } from '@nestjs/common';
import { SimulationService } from './simulation.service';

describe('SimulationService', () => {
  let simulationService: SimulationService;

  beforeEach(() => {
    simulationService = new SimulationService();
  });

  describe('wait', () => {
    it('completes after the requested delay', async () => {
      jest.useFakeTimers();
      let completed = false;
      const result = simulationService.wait(3000).then(() => {
        completed = true;
      });

      await jest.advanceTimersByTimeAsync(2999);

      expect(completed).toBe(false);

      await jest.advanceTimersByTimeAsync(1);

      expect(completed).toBe(true);

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('createRateLimitSimulation', () => {
    it('returns the configured rate limit simulation', () => {
      const limit = 2;
      const windowSeconds = 10;
      const simulation = simulationService.createRateLimitSimulation(
        limit,
        windowSeconds,
      );

      expect(simulation.limit).toEqual(limit);
      expect(simulation.windowSeconds).toEqual(windowSeconds);
      expect(simulation.id).toBeDefined();
    });

    it('generates a unique ID for each simulation', () => {
      const first = simulationService.createRateLimitSimulation(2, 10);
      const second = simulationService.createRateLimitSimulation(2, 10);

      expect(first.id).not.toEqual(second.id);
    });
  });

  describe('checkRateLimit', () => {
    it('checks rate limit after limit is reached', () => {
      const limit = 2;
      const windowSeconds = 10;
      const simulation = simulationService.createRateLimitSimulation(
        limit,
        windowSeconds,
      );
      const first = simulationService.checkRateLimit(simulation.id, 1000);
      const second = simulationService.checkRateLimit(simulation.id, 2000);
      const third = simulationService.checkRateLimit(simulation.id, 3000);

      expect(first.outcome).toBe('allowed');
      expect(second.outcome).toBe('allowed');
      expect(third.outcome).toBe('rate-limited');
    });

    it('check window renewal after', () => {
      const limit = 2;
      const windowSeconds = 10;
      const simulation = simulationService.createRateLimitSimulation(
        limit,
        windowSeconds,
      );

      simulationService.checkRateLimit(simulation.id, 1000);
      simulationService.checkRateLimit(simulation.id, 1001);
      const limited = simulationService.checkRateLimit(simulation.id, 1002);
      const nextWindow = simulationService.checkRateLimit(simulation.id, 11000);

      expect(limited.outcome).toBe('rate-limited');
      expect(nextWindow.outcome).toBe('allowed');
    });

    it('returns not-found for unknown simulation ID', () => {
      const result = simulationService.checkRateLimit('unknown-id');
      expect(result.outcome).toBe('not-found');
    });

    it('returns rate-limited with correct retryAfterSeconds', () => {
      const limit = 1;
      const windowSeconds = 5;
      const simulation = simulationService.createRateLimitSimulation(
        limit,
        windowSeconds,
      );
      simulationService.checkRateLimit(simulation.id, 1000);
      const result = simulationService.checkRateLimit(simulation.id, 2000);
      expect(result.outcome).toBe('rate-limited');
      if (result.outcome === 'rate-limited') {
        expect(result.retryAfterSeconds).toBe(4);
      }
    });

    it('checks rate limit in different simulations are independent', () => {
      const firstSimulation = simulationService.createRateLimitSimulation(
        1,
        10,
      );
      const secondSimulation = simulationService.createRateLimitSimulation(
        1,
        10,
      );

      simulationService.checkRateLimit(firstSimulation.id, 1000);
      simulationService.checkRateLimit(firstSimulation.id, 2000);
      const secondResult = simulationService.checkRateLimit(
        secondSimulation.id,
        1000,
      );
      expect(secondResult.outcome).toBe('allowed');
    });
  });

  describe('checkDefaultRateLimit', () => {
    it('checks the default rate limit', () => {
      const result: string[] = [];
      for (let i = 0; i < 6; i++) {
        result.push(simulationService.checkDefaultRateLimit().outcome);
      }
      expect(result).toEqual([
        'allowed',
        'allowed',
        'allowed',
        'allowed',
        'allowed',
        'rate-limited',
      ]);
    });
  });

  describe('cleanupStaleSimulations', () => {
    it('removes an inactive simulation', () => {
      const simulation = simulationService.createRateLimitSimulation(2, 10);

      simulationService.cleanupStaleSimulations(Date.now() + 5 * 60 * 1000);

      const result = simulationService.checkRateLimit(simulation.id);

      expect(result.outcome).toBe('not-found');
    });

    it('keeps an active simulation', () => {
      const simulation = simulationService.createRateLimitSimulation(2, 10);
      const lastActivity = Date.now();

      simulationService.checkRateLimit(simulation.id, lastActivity);

      const cleanupTime = lastActivity + 5 * 60 * 1000 - 1;
      simulationService.cleanupStaleSimulations(cleanupTime);

      const result = simulationService.checkRateLimit(
        simulation.id,
        cleanupTime,
      );

      expect(result.outcome).toBe('allowed');
    });

    it('does not remove the default rate limit simulation', () => {
      const cleanupTime = Date.now() + 5 * 60 * 1000;
      simulationService.cleanupStaleSimulations(cleanupTime);
      const result = simulationService.checkDefaultRateLimit();
      expect(result.outcome).toBe('allowed');
    });

    it('runs cleanup periodically after initialization', () => {
      jest.useFakeTimers();
      const cleanupSpy = jest.spyOn(
        simulationService,
        'cleanupStaleSimulations',
      );
      simulationService.onModuleInit();
      jest.advanceTimersByTime(3 * 60 * 1000);
      expect(cleanupSpy).toHaveBeenCalledTimes(3);
      simulationService.onModuleDestroy();
    });

    it('stops cleanup after destruction', () => {
      jest.useFakeTimers();
      const cleanupSpy = jest.spyOn(
        simulationService,
        'cleanupStaleSimulations',
      );
      simulationService.onModuleInit();
      simulationService.onModuleDestroy();
      jest.advanceTimersByTime(3 * 60 * 1000);
      expect(cleanupSpy).not.toHaveBeenCalled();
    });
  });

  describe('createScenario', () => {
    it('returns the created scenario id', () => {
      const result = simulationService.createScenario([
        {
          delay: 1000,
          type: 'slow',
          times: 2,
        },
        {
          delay: 1000,
          type: 'unavailable',
          times: 2,
        },
      ]);
      expect(result).toBeDefined();
    });

    it('generates unique scenario ids', () => {
      const steps = [
        {
          type: 'slow' as const,
          times: 1,
          delay: 1000,
        },
      ];

      const firstId = simulationService.createScenario(steps);
      const secondId = simulationService.createScenario(steps);

      expect(firstId).not.toBe(secondId);
    });

    it('rate limit step has rate limit configured and id added', () => {
      const rateLimitCreateSpy = jest.spyOn(
        simulationService,
        'createRateLimitSimulation',
      );
      const result = simulationService.createScenario([
        {
          delay: 1000,
          type: 'slow',
          times: 2,
        },
        {
          type: 'rate-limit',
          times: 2,
          limit: 2,
          windowSeconds: 10,
        },
      ]);
      expect(rateLimitCreateSpy).toHaveBeenCalledWith(2, 10);
      simulationService.getNextStep(result);
      simulationService.getNextStep(result);
      const rateLimitStep = simulationService.getNextStep(result);
      expect(rateLimitStep.type).toBe('rate-limit');

      if (rateLimitStep.type === 'rate-limit') {
        expect(rateLimitStep.configId).toBeDefined();
      }
    });

    describe('getNextStep', () => {
      it('throws an exception if the scenario is not found', () => {
        expect(() => simulationService.getNextStep('invalid-id')).toThrow(
          NotFoundException,
        );
      });

      it('keeps returning the final step after all steps are finished', () => {
        const scenarioId = simulationService.createScenario([
          {
            type: 'slow',
            times: 1,
            delay: 1000,
          },
          {
            type: 'unavailable',
            times: 1,
            delay: 500,
          },
        ]);

        simulationService.getNextStep(scenarioId); // slow
        const finalStep = simulationService.getNextStep(scenarioId); // unavailable
        const repeatedFinalStep = simulationService.getNextStep(scenarioId);

        expect(finalStep.type).toBe('unavailable');
        expect(repeatedFinalStep).toEqual(finalStep);
      });

      it('advances to the next step after the configured number of executions', () => {
        const scenarioId = simulationService.createScenario([
          { type: 'slow', times: 2, delay: 1000 },
          { type: 'unavailable', times: 1, delay: 500 },
        ]);

        expect(simulationService.getNextStep(scenarioId).type).toBe('slow');
        expect(simulationService.getNextStep(scenarioId).type).toBe('slow');
        expect(simulationService.getNextStep(scenarioId).type).toBe(
          'unavailable',
        );
      });

      it('keeps returning the only step in a single-step scenario', () => {
        const scenarioId = simulationService.createScenario([
          { type: 'slow', times: 1, delay: 1000 },
        ]);

        expect(simulationService.getNextStep(scenarioId).type).toBe('slow');
        expect(simulationService.getNextStep(scenarioId).type).toBe('slow');
      });

      it('does not configure rate limiting for non-rate-limit steps', () => {
        const rateLimitCreateSpy = jest.spyOn(
          simulationService,
          'createRateLimitSimulation',
        );

        simulationService.createScenario([
          { type: 'slow', times: 1, delay: 1000 },
          { type: 'unavailable', times: 1, delay: 500 },
        ]);

        expect(rateLimitCreateSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('getNextStep', () => {
    it('throws an exception if the scenario is not found', () => {
      expect(() => simulationService.getNextStep('invalid-id')).toThrow(
        NotFoundException,
      );
    });

    it('keeps returning the final step after all steps are finished', () => {
      const scenarioId = simulationService.createScenario([
        {
          type: 'slow',
          times: 1,
          delay: 1000,
        },
        {
          type: 'unavailable',
          times: 1,
          delay: 500,
        },
      ]);

      simulationService.getNextStep(scenarioId); // slow
      const finalStep = simulationService.getNextStep(scenarioId); // unavailable
      const repeatedFinalStep = simulationService.getNextStep(scenarioId);

      expect(finalStep.type).toBe('unavailable');
      expect(repeatedFinalStep).toEqual(finalStep);
    });

    it('advances to the next step after the configured number of executions', () => {
      const scenarioId = simulationService.createScenario([
        { type: 'slow', times: 2, delay: 1000 },
        { type: 'unavailable', times: 1, delay: 500 },
      ]);

      expect(simulationService.getNextStep(scenarioId).type).toBe('slow');
      expect(simulationService.getNextStep(scenarioId).type).toBe('slow');
      expect(simulationService.getNextStep(scenarioId).type).toBe(
        'unavailable',
      );
    });

    it('keeps returning the only step in a single-step scenario', () => {
      const scenarioId = simulationService.createScenario([
        { type: 'slow', times: 1, delay: 1000 },
      ]);

      expect(simulationService.getNextStep(scenarioId).type).toBe('slow');
      expect(simulationService.getNextStep(scenarioId).type).toBe('slow');
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});
