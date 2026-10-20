import { IsIn, IsInt, Max, Min } from 'class-validator';
import { ScenarioStepDto } from './scenario-step.dto';

export class UnavailableStepDto extends ScenarioStepDto {
  @IsIn(['unavailable'])
  declare type: 'unavailable';

  @IsInt()
  @Min(0)
  @Max(10000)
  delay: number = 0;
}
    