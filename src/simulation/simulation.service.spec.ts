import { SimulationService } from './simulation.service';

describe('SimulationService', () => {
  let simulationService: SimulationService;

  beforeEach(() => {
    simulationService = new SimulationService();
  });

  it('returns slow response after the requested delay', async () => {
    jest.useFakeTimers();

    const result = simulationService.getSlowResponse(3000);

    await jest.advanceTimersByTimeAsync(3000);

    await expect(result).resolves.toBe('slow response');
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});
