import { IsBoolean, IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  courseId?: number;

  @IsOptional()
  @IsDateString()
  enrolledDate?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsDateString()
  completionDate?: string | null;

  @IsOptional()
  @IsDateString()
  canceledAt?: string | null;
}
