import { IsIn, IsInt, Min } from 'class-validator';
import { ScenarioStepDto } from './scenario-step.dto';

export class RateLimitStepDto extends ScenarioStepDto {
  @IsIn(['rate-limit'])
  declare type: 'rate-limit';

  @IsInt()
  @Min(1)
  limit: number;

  @IsInt()
  @Min(1)
  windowSeconds: number;
}
