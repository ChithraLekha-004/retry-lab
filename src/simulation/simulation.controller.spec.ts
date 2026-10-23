import { Test } from '@nestjs/testing';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { HttpException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

describe('SimulationController', () => {
  let simulationController: SimulationController;

  const mockSimulationService = {
    wait: jest.fn(),
    createRateLimitSimulation: jest.fn(),
    checkRateLimit: jest.fn(),
    checkDefaultRateLimit: jest.fn(),
    createScenario: jest.fn(),
    getNextStep: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [SimulationController],
      providers: [
        { provide: SimulationService, useValue: mockSimulationService },
      ],
    }).compile();
    simulationController =
      module.get<SimulationController>(SimulationController);
  });

  describe('checkRateLimit', () => {
    it('should call simulationService.checkRateLimit with the correct id', () => {
      const id = 'test-id';
      const mockResult = { outcome: 'allowed' };
      mockSimulationService.checkRateLimit.mockReturnValue(mockResult);
      const response = simulationController.checkRateLimit(id, {
        setHeader: jest.fn(),
      } as any);

      expect(mockSimulationService.checkRateLimit).toHaveBeenCalledWith(id);
      expect(response).toEqual('rate-limit response');
    });

    it('should throw NotFoundException if the simulation is not found', () => {
      const id = 'non-existent-id';
      const mockResult = { outcome: 'not-found' };
      mockSimulationService.checkRateLimit.mockReturnValue(mockResult);

      expect(() => simulationController.checkRateLimit(id, {
        setHeader: jest.fn(),
      } as any)).toThrow(NotFoundException);
    })

    it('should set Retry-After header and throw HttpException if rate-limited', () => {
      const id = 'test-id';
      const retryAfterSeconds = 10;
      const mockResult = { outcome: 'rate-limited', retryAfterSeconds };
      mockSimulationService.checkRateLimit.mockReturnValue(mockResult);
      const responseMock = { setHeader: jest.fn() };

      let errorCaught: any;

      try {
        simulationController.checkRateLimit(id, responseMock as any)
      }
      catch (error) {
        errorCaught = error;
      }
      expect(errorCaught).toBeInstanceOf(HttpException);
      if (errorCaught instanceof HttpException) {
        expect(errorCaught.getStatus()).toBe(429);
        expect(errorCaught.getResponse()).toEqual('Rate limit exceeded');
      }
      expect(responseMock.setHeader).toHaveBeenCalledWith('Retry-After', retryAfterSeconds.toString());
    });

  });

  describe('getNextStep', () => {
    it('waits for the configured delay and returns the slow response', async () => {
      mockSimulationService.getNextStep.mockReturnValue({
        type: 'slow',
        times: 1,
        delay: 1000,
      });

      const response = await simulationController.getNextStep(
        'test-scenario-id',
        { setHeader: jest.fn() } as any,
      );

      expect(mockSimulationService.getNextStep).toHaveBeenCalledWith(
        'test-scenario-id',
      );
      expect(mockSimulationService.wait).toHaveBeenCalledWith(1000);
      expect(response).toBe('slow-response');
    });

    it('waits for the configured delay and throws ServiceUnavailableException', async () => {
      mockSimulationService.getNextStep.mockReturnValue({
        type: 'unavailable',
        times: 1,
        delay: 500,
      });

      await expect(
        simulationController.getNextStep(
          'test-scenario-id',
          { setHeader: jest.fn() } as any,
        ),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(mockSimulationService.wait).toHaveBeenCalledWith(500);
    });

    it('calls the rate limit simulation when getNextStep returns rate-limit', async () => {
      mockSimulationService.getNextStep.mockReturnValue({
        type: 'rate-limit',
        times: 1,
        windowSeconds: 10,
        limit: 5,
        configId: 'test-rate-limit-id',
      });
      mockSimulationService.checkRateLimit.mockReturnValue({
        outcome: 'allowed',
      });
      const result = await simulationController.getNextStep('test-scenario-id', {
        setHeader: jest.fn(),
      } as any)
      expect(mockSimulationService.checkRateLimit).toHaveBeenCalledWith('test-rate-limit-id');
      expect(result).toBe('rate-limit response');
    });
  });
});
