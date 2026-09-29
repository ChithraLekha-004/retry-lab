import { Injectable } from '@nestjs/common';

@Injectable()
export class SimulationService {
  getSlowResponse(delay:number): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('slow response');
      }, delay);
    });
  }
}
