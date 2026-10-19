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
    })
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});
