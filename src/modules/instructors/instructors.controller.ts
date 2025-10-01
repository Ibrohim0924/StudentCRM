import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { InstructorsService } from './instructors.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { Instructor } from './entities/instructor.entity';
import { Course } from '../courses/entities/course.entity';
import { UpdateInstructorDto } from './dto/update-instructor.dto';

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

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Instructor> {
    return this.instructorsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInstructorDto: UpdateInstructorDto,
  ): Promise<Instructor> {
    return this.instructorsService.update(id, updateInstructorDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.instructorsService.remove(id);
  }
}
