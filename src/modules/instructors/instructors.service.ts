import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instructor } from './entities/instructor.entity';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { Course } from '../courses/entities/course.entity';
import { UpdateInstructorDto } from './dto/update-instructor.dto';

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

  async findOne(id: number): Promise<Instructor> {
    const instructor = await this.instructorRepository.findOne({
      where: { id },
      relations: {
        courses: true,
      },
    });

    if (!instructor) {
      throw new NotFoundException(`Instructor with id ${id} not found`);
    }

    return instructor;
  }

  async update(id: number, updateInstructorDto: UpdateInstructorDto): Promise<Instructor> {
    const instructor = await this.requireInstructor(id);

    if (updateInstructorDto.email && updateInstructorDto.email !== instructor.email) {
      const existing = await this.instructorRepository.findOne({
        where: { email: updateInstructorDto.email },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Instructor with this email already exists');
      }
    }

    if (updateInstructorDto.name !== undefined) {
      instructor.name = updateInstructorDto.name;
    }
    if (updateInstructorDto.email !== undefined) {
      instructor.email = updateInstructorDto.email;
    }
    if (updateInstructorDto.bio !== undefined) {
      instructor.bio = updateInstructorDto.bio;
    }

    return this.instructorRepository.save(instructor);
  }

  async findCourses(id: number): Promise<Course[]> {
    await this.requireInstructor(id);

    return this.courseRepository.find({
      where: { instructorId: id },
      order: { startDate: 'ASC' },
    });
  }

  async remove(id: number): Promise<void> {
    const instructor = await this.requireInstructor(id);
    await this.instructorRepository.remove(instructor);
  }

  private async requireInstructor(id: number): Promise<Instructor> {
    const instructor = await this.instructorRepository.findOne({ where: { id } });
    if (!instructor) {
      throw new NotFoundException(`Instructor with id ${id} not found`);
    }
    return instructor;
  }
}
