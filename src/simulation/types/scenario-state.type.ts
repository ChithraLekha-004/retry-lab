import { ScenarioStepDto } from '../dto/scenario-step.dto';

export interface ScenarioState {
  id: string;
  steps: ScenarioStepDto[];
  currentStepIndex: number;
  currentStepCount: number;
}
