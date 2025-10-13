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
import { StudentsService, StudentProfile } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { Student } from './entities/student.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  create(
    @Body() createStudentDto: CreateStudentDto,
    @CurrentUser() current: AuthUser,
  ): Promise<Student> {
    return this.studentsService.create(createStudentDto, current);
  }

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER)
  findAll(@CurrentUser() current: AuthUser): Promise<Student[]> {
    return this.studentsService.findAll(current);
  }

  @Get(':id/history')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER)
  history(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() current: AuthUser,
  ): Promise<Enrollment[]> {
    return this.studentsService.getHistory(id, current);
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() current: AuthUser,
  ): Promise<StudentProfile> {
    return this.studentsService.getProfile(id, current);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStudentDto: UpdateStudentDto,
    @CurrentUser() current: AuthUser,
  ): Promise<Student> {
    return this.studentsService.update(id, updateStudentDto, current);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() current: AuthUser): Promise<void> {
    return this.studentsService.remove(id, current);
  }
}
