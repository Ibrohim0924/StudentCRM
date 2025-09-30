import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { StudentsService, StudentProfile } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { Student } from './entities/student.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { UpdateStudentDto } from './dto/update-student.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() createStudentDto: CreateStudentDto): Promise<Student> {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  findAll(): Promise<Student[]> {
    return this.studentsService.findAll();
  }

  @Get(':id/history')
  history(@Param('id', ParseIntPipe) id: number): Promise<Enrollment[]> {
    return this.studentsService.getHistory(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<StudentProfile> {
    return this.studentsService.getProfile(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<Student> {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.studentsService.remove(id);
  }
}
