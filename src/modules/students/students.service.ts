import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Instructor } from '../instructors/entities/instructor.entity';
import { Branch } from '../branches/entities/branch.entity';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { UserRole } from '../users/entities/user.entity';

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
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async create(createStudentDto: CreateStudentDto, user: AuthUser): Promise<Student> {
    const branchId = await this.resolveBranchForWrite(createStudentDto.branchId, user);

    const existing = await this.studentRepository.findOne({
      where: { email: createStudentDto.email },
    });
    if (existing) {
      throw new ConflictException('Student with this email already exists');
    }

    const instructorWithEmail = await this.instructorRepository.findOne({
      where: { email: createStudentDto.email },
    });
    if (instructorWithEmail) {
      throw new ConflictException('Instructor with this email already exists');
    }

    const student = this.studentRepository.create({
      name: createStudentDto.name,
      email: createStudentDto.email,
      enrolledAt: createStudentDto.enrolledAt
        ? new Date(createStudentDto.enrolledAt)
        : new Date(),
      branchId,
      createdById: user.id,
    });

    return this.studentRepository.save(student);
  }

  async findAll(user: AuthUser): Promise<Student[]> {
    if (user.role === UserRole.SUPERADMIN) {
      return this.studentRepository.find({
        relations: { branch: true },
        order: { name: 'ASC' },
      });
    }

    const branchId = this.getBranchIdOrThrow(user);
    return this.studentRepository.find({
      where: { branchId },
      relations: { branch: true },
      order: { name: 'ASC' },
    });
  }

  async update(id: number, dto: UpdateStudentDto, user: AuthUser): Promise<Student> {
    const student = await this.requireStudent(id, user);

    if (dto.email && dto.email !== student.email) {
      const existing = await this.studentRepository.findOne({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Student with this email already exists');
      }
      const instructorWithEmail = await this.instructorRepository.findOne({
        where: { email: dto.email },
      });
      if (instructorWithEmail) {
        throw new ConflictException('Instructor with this email already exists');
      }
      student.email = dto.email;
    }

    if (dto.name !== undefined) {
      student.name = dto.name;
    }
    if (dto.enrolledAt !== undefined) {
      student.enrolledAt = new Date(dto.enrolledAt);
    }

    if (dto.branchId !== undefined) {
      if (user.role !== UserRole.SUPERADMIN) {
        throw new ForbiddenException('Only superadmin can change branch');
      }
      await this.verifyBranch(dto.branchId);
      student.branchId = dto.branchId;
    }

    return this.studentRepository.save(student);
  }

  async remove(id: number, user: AuthUser): Promise<void> {
    const student = await this.requireStudent(id, user);
    await this.studentRepository.remove(student);
  }

  async getProfile(id: number, user: AuthUser): Promise<StudentProfile> {
    const student = await this.requireStudent(id, user);

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

  async getHistory(id: number, user: AuthUser): Promise<Enrollment[]> {
    await this.requireStudent(id, user);
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

  private async requireStudent(id: number, user?: AuthUser): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: { branch: true },
    });
    if (!student) {
      throw new NotFoundException(`Student with id ${id} not found`);
    }

    if (user && user.role !== UserRole.SUPERADMIN) {
      const branchId = this.getBranchIdOrThrow(user);
      if (student.branchId !== branchId) {
        throw new ForbiddenException('Access to this student is not allowed');
      }
    }

    return student;
  }

  private async resolveBranchForWrite(
    requestedBranchId: number | undefined,
    user: AuthUser,
  ): Promise<number> {
    if (user.role === UserRole.SUPERADMIN) {
      if (!requestedBranchId) {
        throw new BadRequestException('branchId is required');
      }
      await this.verifyBranch(requestedBranchId);
      return requestedBranchId;
    }

    const branchId = this.getBranchIdOrThrow(user);
    if (requestedBranchId && requestedBranchId !== branchId) {
      throw new ForbiddenException('You can only work within your branch');
    }
    return branchId;
  }

  private async verifyBranch(branchId: number | null | undefined): Promise<void> {
    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }
    const exists = await this.branchRepository.exists({ where: { id: branchId } });
    if (!exists) {
      throw new NotFoundException(`Branch with id ${branchId} not found`);
    }
  }

  private getBranchIdOrThrow(user: AuthUser): number {
    if (!user.branchId) {
      throw new BadRequestException('Branch is not assigned to current user');
    }
    return user.branchId;
  }
}
