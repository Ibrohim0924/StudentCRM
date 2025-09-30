import { IsInt, Min } from 'class-validator';

export class UnenrollDto {
  @IsInt()
  @Min(1)
  enrollmentId: number;
}