import { Body, Controller, Get, Post } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { CompleteEnrollmentDto } from './dto/complete-enrollment.dto';
import { UnenrollDto } from './dto/unenroll.dto';
import { Enrollment } from './entities/enrollment.entity';

@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post('enroll')
  enroll(@Body() enrollStudentDto: EnrollStudentDto): Promise<Enrollment> {
    return this.enrollmentsService.enroll(enrollStudentDto);
  }

  @Post('complete')
  complete(@Body() completeDto: CompleteEnrollmentDto): Promise<Enrollment> {
    return this.enrollmentsService.complete(completeDto);
  }

  @Post('unenroll')
  unenroll(@Body() unenrollDto: UnenrollDto): Promise<Enrollment> {
    return this.enrollmentsService.unenroll(unenrollDto);
  }

  @Get('enrollments/active')
  findActive(): Promise<Enrollment[]> {
    return this.enrollmentsService.findActiveEnrollments();
  }
}