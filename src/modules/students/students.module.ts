import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { Student } from './entities/student.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Instructor } from '../instructors/entities/instructor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Enrollment, Instructor])],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
