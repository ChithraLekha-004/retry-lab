import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { SlowQueryDto } from './dto/slow-query.dto';

@Controller('simulate')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('slow')
  getSlowResponse(@Query(new ValidationPipe({transform: true})) slowQueryDto: SlowQueryDto): Promise<string> {
    return this.simulationService.getSlowResponse(slowQueryDto.delay);
  }
}
