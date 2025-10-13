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
import { InstructorsService } from './instructors.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { Instructor } from './entities/instructor.entity';
import { Course } from '../courses/entities/course.entity';
import { UpdateInstructorDto } from './dto/update-instructor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@Controller('instructors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  create(
    @Body() createInstructorDto: CreateInstructorDto,
    @CurrentUser() current: AuthUser,
  ): Promise<Instructor> {
    return this.instructorsService.create(createInstructorDto, current);
  }

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER)
  findAll(@CurrentUser() current: AuthUser): Promise<Instructor[]> {
    return this.instructorsService.findAll(current);
  }

  @Get(':id/courses')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER)
  findCourses(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() current: AuthUser,
  ): Promise<Course[]> {
    return this.instructorsService.findCourses(id, current);
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() current: AuthUser,
  ): Promise<Instructor> {
    return this.instructorsService.findOne(id, current);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInstructorDto: UpdateInstructorDto,
    @CurrentUser() current: AuthUser,
  ): Promise<Instructor> {
    return this.instructorsService.update(id, updateInstructorDto, current);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() current: AuthUser,
  ): Promise<void> {
    return this.instructorsService.remove(id, current);
  }
}
