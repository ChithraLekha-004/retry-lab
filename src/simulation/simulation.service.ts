import { Injectable } from '@nestjs/common';

@Injectable()
export class SimulationService {
  wait(delay:number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, delay);
    });
  }
}
