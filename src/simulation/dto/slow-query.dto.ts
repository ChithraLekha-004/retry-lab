import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class SlowQueryDto {
  @Transform(({ value }) => {
    if (typeof value !== 'string') return NaN;
    if(value.trim() === '') return NaN;
    return Number(value);
  })
  @IsInt()
  @Min(0)
  @Max(10000)
  delay: number = 4000;
}
