import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { UpdateStudentDto } from './dto/update-student.dto';

export interface StudentProfile {
  student: Student;
  activeEnrollments: Enrollment[];
  completedEnrollments: Enrollment[];
  canceledEnrollments: Enrollment[];
}

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  async create(createStudentDto: CreateStudentDto): Promise<Student> {
    const existing = await this.studentRepository.findOne({
      where: { email: createStudentDto.email },
    });
    if (existing) {
      throw new ConflictException('Student with this email already exists');
    }

    const student = this.studentRepository.create({
      ...createStudentDto,
      enrolledAt: createStudentDto.enrolledAt
        ? new Date(createStudentDto.enrolledAt)
        : new Date(),
    });

    return this.studentRepository.save(student);
  }

  findAll(): Promise<Student[]> {
    return this.studentRepository.find({ order: { name: 'ASC' } });
  }

  async update(id: number, updateStudentDto: UpdateStudentDto): Promise<Student> {
    const student = await this.requireStudent(id);

    if (updateStudentDto.email && updateStudentDto.email !== student.email) {
      const existing = await this.studentRepository.findOne({
        where: { email: updateStudentDto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Student with this email already exists');
      }
    }

    if (updateStudentDto.name !== undefined) {
      student.name = updateStudentDto.name;
    }
    if (updateStudentDto.email !== undefined) {
      student.email = updateStudentDto.email;
    }
    if (updateStudentDto.enrolledAt !== undefined) {
      student.enrolledAt = new Date(updateStudentDto.enrolledAt);
    }

    return this.studentRepository.save(student);
  }

  async remove(id: number): Promise<void> {
    const student = await this.requireStudent(id);
    await this.studentRepository.remove(student);
  }

  async getProfile(id: number): Promise<StudentProfile> {
    const student = await this.requireStudent(id);

    const enrollments = await this.enrollmentRepository.find({
      where: { studentId: id },
      relations: {
        course: true,
      },
      order: {
        enrolledDate: 'DESC',
      },
    });

    const activeEnrollments = enrollments.filter(
      (enrollment) => !enrollment.canceledAt && !enrollment.completed,
    );
    const completedEnrollments = enrollments.filter((enrollment) => enrollment.completed);
    const canceledEnrollments = enrollments.filter((enrollment) => enrollment.canceledAt);

    return {
      student,
      activeEnrollments,
      completedEnrollments,
      canceledEnrollments,
    };
  }

  async getHistory(id: number): Promise<Enrollment[]> {
    await this.requireStudent(id);
    return this.enrollmentRepository.find({
      where: { studentId: id },
      relations: {
        course: true,
      },
      order: {
        enrolledDate: 'DESC',
      },
    });
  }

  private async requireStudent(id: number): Promise<Student> {
    const student = await this.studentRepository.findOne({ where: { id } });
    if (!student) {
      throw new NotFoundException(`Student with id ${id} not found`);
    }
    return student;
  }
}
