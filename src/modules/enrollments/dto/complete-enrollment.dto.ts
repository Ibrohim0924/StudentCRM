import { IsInt, Min } from 'class-validator';

export class CompleteEnrollmentDto {
  @IsInt()
  @Min(1)
  enrollmentId: number;
}