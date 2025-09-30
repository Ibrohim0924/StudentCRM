import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instructor } from './entities/instructor.entity';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class InstructorsService {
  constructor(
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(createInstructorDto: CreateInstructorDto): Promise<Instructor> {
    const existing = await this.instructorRepository.findOne({
      where: { email: createInstructorDto.email },
    });

    if (existing) {
      throw new ConflictException('Instructor with this email already exists');
    }

    const instructor = this.instructorRepository.create(createInstructorDto);
    return this.instructorRepository.save(instructor);
  }

  findAll(): Promise<Instructor[]> {
    return this.instructorRepository.find({ order: { name: 'ASC' } });
  }

  async findCourses(id: number): Promise<Course[]> {
    const instructor = await this.instructorRepository.findOne({
      where: { id },
    });

    if (!instructor) {
      throw new NotFoundException(`Instructor with id ${id} not found`);
    }

    return this.courseRepository.find({
      where: { instructorId: id },
      order: { startDate: 'ASC' },
    });
  }
}