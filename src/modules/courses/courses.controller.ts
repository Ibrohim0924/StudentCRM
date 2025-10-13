import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseFilterDto } from './dto/course-filter.dto';
import { Course } from './entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  create(
    @Body() createCourseDto: CreateCourseDto,
    @CurrentUser() current: AuthUser,
  ): Promise<Course> {
    return this.coursesService.create(createCourseDto, current);
  }

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER)
  findAll(
    @Query() filter: CourseFilterDto,
    @CurrentUser() current: AuthUser,
  ): Promise<Course[]> {
    return this.coursesService.findAll(filter, current);
  }

  @Get(':id/roster')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  roster(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() current: AuthUser,
  ): Promise<Enrollment[]> {
    return this.coursesService.getRoster(id, current);
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() current: AuthUser,
  ): Promise<Course> {
    return this.coursesService.findOne(id, current);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourseDto: UpdateCourseDto,
    @CurrentUser() current: AuthUser,
  ): Promise<Course> {
    return this.coursesService.update(id, updateCourseDto, current);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() current: AuthUser,
  ): Promise<void> {
    return this.coursesService.remove(id, current);
  }
}
