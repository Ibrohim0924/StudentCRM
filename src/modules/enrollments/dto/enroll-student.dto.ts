import { IsInt, Min } from 'class-validator';

export class EnrollStudentDto {
  @IsInt()
  @Min(1)
  studentId: number;

  @IsInt()
  @Min(1)
  courseId: number;
}