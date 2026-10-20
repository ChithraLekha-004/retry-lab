import { IsIn, IsInt, Min } from "class-validator";

export type ScenarioStepType = 'slow' | 'unavailable' | 'rate-limit';

export class ScenarioStepDto {
  @IsIn(['slow', 'unavailable', 'rate-limit'])
  type: ScenarioStepType;

  @IsInt()
  @Min(1)
  times: number;
}