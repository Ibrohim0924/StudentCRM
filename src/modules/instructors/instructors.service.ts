import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instructor } from './entities/instructor.entity';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { Course } from '../courses/entities/course.entity';
import { UpdateInstructorDto } from './dto/update-instructor.dto';
import { Student } from '../students/entities/student.entity';
import { Branch } from '../branches/entities/branch.entity';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class InstructorsService {
  constructor(
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async create(createInstructorDto: CreateInstructorDto, user: AuthUser): Promise<Instructor> {
    const branchId = await this.resolveBranchForWrite(createInstructorDto.branchId, user);

    const existing = await this.instructorRepository.findOne({
      where: { email: createInstructorDto.email },
    });
    if (existing) {
      throw new ConflictException('Instructor with this email already exists');
    }

    const studentWithEmail = await this.studentRepository.findOne({
      where: { email: createInstructorDto.email },
    });
    if (studentWithEmail) {
      throw new ConflictException('Student with this email already exists');
    }

    const instructor = this.instructorRepository.create({
      name: createInstructorDto.name,
      email: createInstructorDto.email,
      bio: createInstructorDto.bio,
      branchId,
      createdById: user.id,
    });
    return this.instructorRepository.save(instructor);
  }

  async findAll(user: AuthUser): Promise<Instructor[]> {
    if (user.role === UserRole.SUPERADMIN) {
      return this.instructorRepository.find({
        relations: { branch: true },
        order: { name: 'ASC' },
      });
    }

    const branchId = this.getBranchIdOrThrow(user);
    return this.instructorRepository.find({
      where: { branchId },
      relations: { branch: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number, user: AuthUser): Promise<Instructor> {
    return this.requireInstructor(id, user, { courses: true, branch: true });
  }

  async update(
    id: number,
    updateInstructorDto: UpdateInstructorDto,
    user: AuthUser,
  ): Promise<Instructor> {
    const instructor = await this.requireInstructor(id, user);

    if (updateInstructorDto.email && updateInstructorDto.email !== instructor.email) {
      const existing = await this.instructorRepository.findOne({
        where: { email: updateInstructorDto.email },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Instructor with this email already exists');
      }

      const studentWithEmail = await this.studentRepository.findOne({
        where: { email: updateInstructorDto.email },
      });
      if (studentWithEmail) {
        throw new ConflictException('Student with this email already exists');
      }
      instructor.email = updateInstructorDto.email;
    }

    if (updateInstructorDto.name !== undefined) {
      instructor.name = updateInstructorDto.name;
    }

    if (updateInstructorDto.bio !== undefined) {
      instructor.bio = updateInstructorDto.bio;
    }

    if (updateInstructorDto.branchId !== undefined) {
      if (user.role !== UserRole.SUPERADMIN) {
        throw new ForbiddenException('Only superadmin can change instructor branch');
      }
      await this.verifyBranch(updateInstructorDto.branchId);
      instructor.branchId = updateInstructorDto.branchId;
    }

    return this.instructorRepository.save(instructor);
  }

  async findCourses(id: number, user: AuthUser): Promise<Course[]> {
    const instructor = await this.requireInstructor(id, user);

    const where =
      user.role === UserRole.SUPERADMIN
        ? { instructorId: instructor.id }
        : { instructorId: instructor.id, branchId: this.getBranchIdOrThrow(user) };

    return this.courseRepository.find({
      where,
      order: { startDate: 'ASC' },
    });
  }

  async remove(id: number, user: AuthUser): Promise<void> {
    const instructor = await this.requireInstructor(id, user);
    await this.instructorRepository.remove(instructor);
  }

  private async requireInstructor(
    id: number,
    user?: AuthUser,
    relations?: Parameters<Repository<Instructor>['findOne']>[0]['relations'],
  ): Promise<Instructor> {
    const instructor = await this.instructorRepository.findOne({
      where: { id },
      relations,
    });
    if (!instructor) {
      throw new NotFoundException(`Instructor with id ${id} not found`);
    }

    if (user && user.role !== UserRole.SUPERADMIN) {
      const branchId = this.getBranchIdOrThrow(user);
      if (instructor.branchId !== branchId) {
        throw new ForbiddenException('Access to this instructor is not allowed');
      }
    }

    return instructor;
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
      throw new ForbiddenException('You can only manage instructors within your branch');
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
