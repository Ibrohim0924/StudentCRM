import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { CompleteEnrollmentDto } from './dto/complete-enrollment.dto';
import { UnenrollDto } from './dto/unenroll.dto';
import { Enrollment } from './entities/enrollment.entity';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post('enroll')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  enroll(
    @Body() enrollStudentDto: EnrollStudentDto,
    @CurrentUser() current: AuthUser,
  ): Promise<Enrollment> {
    return this.enrollmentsService.enroll(enrollStudentDto, current);
  }

  @Post('complete')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  complete(
    @Body() completeDto: CompleteEnrollmentDto,
    @CurrentUser() current: AuthUser,
  ): Promise<Enrollment> {
    return this.enrollmentsService.complete(completeDto, current);
  }

  @Post('unenroll')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  unenroll(
    @Body() unenrollDto: UnenrollDto,
    @CurrentUser() current: AuthUser,
  ): Promise<Enrollment> {
    return this.enrollmentsService.unenroll(unenrollDto, current);
  }

  @Get('enroll')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER)
  findAll(@CurrentUser() current: AuthUser): Promise<Enrollment[]> {
    return this.enrollmentsService.findAll(current);
  }

  @Get('enroll/:id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() current: AuthUser,
  ): Promise<Enrollment> {
    return this.enrollmentsService.findOne(id, current);
  }

  @Patch('enroll/:id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
    @CurrentUser() current: AuthUser,
  ): Promise<Enrollment> {
    return this.enrollmentsService.update(id, updateEnrollmentDto, current);
  }

  @Delete('enroll/:id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() current: AuthUser,
  ): Promise<void> {
    return this.enrollmentsService.remove(id, current);
  }

  @Get('enrollments/active')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER)
  findActive(@CurrentUser() current: AuthUser): Promise<Enrollment[]> {
    return this.enrollmentsService.findActiveEnrollments(current);
  }
}
