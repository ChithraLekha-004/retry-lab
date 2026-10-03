import {
  Controller,
  Get,
  Query,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { SlowQueryDto } from './dto/slow-query.dto';

@Controller('simulate')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('slow')
  async getSlowResponse(
    @Query(new ValidationPipe({ transform: true })) slowQueryDto: SlowQueryDto,
  ): Promise<string> {
    await this.simulationService.wait(slowQueryDto.delay);
    return 'slow response';
  }

  @Get('unavailable')
  async getUnavailableResponse(
    @Query(new ValidationPipe({ transform: true })) slowQueryDto: SlowQueryDto,
  ) {
    await this.simulationService.wait(slowQueryDto.delay);
    throw new ServiceUnavailableException('Simulated service unavailable');
  }
}
