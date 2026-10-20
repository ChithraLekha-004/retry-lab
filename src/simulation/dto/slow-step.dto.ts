import { IsIn, IsInt, Max, Min } from 'class-validator';
import { ScenarioStepDto } from './scenario-step.dto';

export class SlowStepDto extends ScenarioStepDto {
  @IsIn(['slow'])
  declare type: 'slow';

  @IsInt()
  @Min(0)
  @Max(10000)
  delay: number = 4000;
}
