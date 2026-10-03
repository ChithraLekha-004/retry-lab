import { SimulationService } from './simulation.service';

describe('SimulationService', () => {
  let simulationService: SimulationService;

  beforeEach(() => {
    simulationService = new SimulationService();
  });

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

  afterEach(() => {
    jest.useRealTimers();
  });
});
