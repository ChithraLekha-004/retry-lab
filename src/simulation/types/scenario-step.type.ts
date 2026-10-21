import { RateLimitStepDto } from '../dto/rate-limit-step.dto';
import { SlowStepDto } from '../dto/slow-step.dto';
import { UnavailableStepDto } from '../dto/unavailable-step.dto';

export type ScenarioStep = SlowStepDto | UnavailableStepDto | RateLimitStepDto;

export interface RateLimitStep extends RateLimitStepDto {
  configId: string;
}


export type StoredScenarioStep =
  | SlowStepDto
  | UnavailableStepDto
  | RateLimitStep;