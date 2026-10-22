import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { SlowQueryDto, UnavailableQueryDto } from './dto/slow-query.dto';
import { CreateRateLimitDto } from './dto/create-rate-limit.dto';
import type { Response } from 'express';
import { RateLimitResult } from './types/rate-limit.types';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { StoredScenarioStep } from './types/scenario-step.type';

@Controller('simulate')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('slow')
  async getSlowResponse(@Query() slowQueryDto: SlowQueryDto): Promise<string> {
    await this.simulationService.wait(slowQueryDto.delay);
    return 'slow response';
  }

  @Get('unavailable')
  async getUnavailableResponse(
    @Query() unavailableQueryDto: UnavailableQueryDto,
  ) {
    await this.simulationService.wait(unavailableQueryDto.delay);
    throw new ServiceUnavailableException('Simulated service unavailable');
  }

  @Post('rate-limit')
  createRateLimitSimulation(@Body() createRateLimitDto: CreateRateLimitDto) {
    return this.simulationService.createRateLimitSimulation(
      createRateLimitDto.limit,
      createRateLimitDto.windowSeconds,
    );
  }

  private handleRateLimitResult(
    result: RateLimitResult,
    response: Response,
  ): string {
    if (result.outcome === 'not-found') {
      throw new NotFoundException('Rate-limit simulation not found');
    }

    if (result.outcome === 'rate-limited') {
      response.setHeader('Retry-After', result.retryAfterSeconds.toString());
      throw new HttpException(
        'Rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return 'rate-limit response';
  }

  @Get('rate-limit/:id')
  checkRateLimit(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): string {
    const result = this.simulationService.checkRateLimit(id);
    return this.handleRateLimitResult(result, response);
  }

  @Get('rate-limit')
  checkDefaultRateLimit(
    @Res({ passthrough: true }) response: Response,
  ): string {
    const result = this.simulationService.checkDefaultRateLimit();
    return this.handleRateLimitResult(result, response);
  }

  @Post('scenarios')
  createScenario(@Body() createScenarioDto: CreateScenarioDto): string {
    return this.simulationService.createScenario(createScenarioDto.steps);
  }

  @Get('scenarios/:id/next-step')
  async getNextStep(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const nextStep: StoredScenarioStep = this.simulationService.getNextStep(id);

    if (nextStep.type === 'slow') {
      await this.simulationService.wait(nextStep.delay);
      return 'slow-response';
    }

    if (nextStep.type === 'unavailable') {
      await this.simulationService.wait(nextStep.delay);
      throw new ServiceUnavailableException('Simulated service unavailable');
    }

    if (nextStep.type === 'rate-limit') {
      const result = this.simulationService.checkRateLimit(nextStep.configId);
      return this.handleRateLimitResult(result, response);
    }
  }
}
