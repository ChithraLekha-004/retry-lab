import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';

import { ScenarioStepDto } from './scenario-step.dto';
import { SlowStepDto } from './slow-step.dto';
import { UnavailableStepDto } from './unavailable-step.dto';
import { RateLimitStepDto } from './rate-limit-step.dto';
import { ScenarioStep } from '../types/scenario-step.type';

export class CreateScenarioDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScenarioStepDto, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: SlowStepDto, name: 'slow' },
        { value: UnavailableStepDto, name: 'unavailable' },
        { value: RateLimitStepDto, name: 'rate-limit' },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  steps: ScenarioStep[];
}