import { StoredScenarioStep } from './scenario-step.type';

export interface ScenarioState {
  id: string;
  steps: StoredScenarioStep[];
  currentStepIndex: number;
  currentStepCount: number;
}
