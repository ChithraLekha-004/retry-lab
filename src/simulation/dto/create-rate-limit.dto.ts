import { IsInt, Min } from 'class-validator';

export class CreateRateLimitDto {
  @IsInt()
  @Min(1)
  limit: number;

  @IsInt()
  @Min(1)
  windowSeconds: number;
}
