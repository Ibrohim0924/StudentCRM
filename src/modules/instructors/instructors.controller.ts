import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { InstructorsService } from './instructors.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { Instructor } from './entities/instructor.entity';
import { Course } from '../courses/entities/course.entity';

@Controller('instructors')
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @Post()
  create(@Body() createInstructorDto: CreateInstructorDto): Promise<Instructor> {
    return this.instructorsService.create(createInstructorDto);
  }

  @Get()
  findAll(): Promise<Instructor[]> {
    return this.instructorsService.findAll();
  }

  @Get(':id/courses')
  findCourses(@Param('id', ParseIntPipe) id: number): Promise<Course[]> {
    return this.instructorsService.findCourses(id);
  }
}