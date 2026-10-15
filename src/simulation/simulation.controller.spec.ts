import { Test } from '@nestjs/testing';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { HttpException, NotFoundException } from '@nestjs/common';

describe('SimulationController', () => {
  let simulationController: SimulationController;

  const mockSimulationService = {
    wait: jest.fn(),
    createRateLimitSimulation: jest.fn(),
    checkRateLimit: jest.fn(),
    checkDefaultRateLimit: jest.fn(),
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

     try{
        simulationController.checkRateLimit(id, responseMock as any)
     }
     catch(error){
        errorCaught = error;
     }
      expect(errorCaught).toBeInstanceOf(HttpException);
      if(errorCaught instanceof HttpException){
        expect(errorCaught.getStatus()).toBe(429);
        expect(errorCaught.getResponse()).toEqual('Rate limit exceeded');
      }
      expect(responseMock.setHeader).toHaveBeenCalledWith('Retry-After', retryAfterSeconds.toString());
    });

  });
});
