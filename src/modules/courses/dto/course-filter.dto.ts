import { IsIn, IsOptional } from 'class-validator';

export type CourseStatus = 'upcoming' | 'ongoing' | 'completed';

export class CourseFilterDto {
  @IsOptional()
  @IsIn(['upcoming', 'ongoing', 'completed'])
  status?: CourseStatus;
}