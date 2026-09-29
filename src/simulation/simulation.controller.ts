import { Controller, Get } from '@nestjs/common';
import { SimulationService } from './simulation.service';

@Controller('simulate')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('slow')
  getSlowResponse(): Promise<string> {
    return this.simulationService.getSlowResponse(5000);
  }
}
