import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { Student } from '../students/entities/student.entity';
import { Course } from '../courses/entities/course.entity';
import { CompleteEnrollmentDto } from './dto/complete-enrollment.dto';
import { UnenrollDto } from './dto/unenroll.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly dataSource: DataSource,
  ) {}

  async enroll(enrollStudentDto: EnrollStudentDto, user: AuthUser): Promise<Enrollment> {
    const { studentId, courseId } = enrollStudentDto;

    const savedEnrollment = await this.dataSource.transaction(async (manager) => {
      const student = await manager.findOne(Student, { where: { id: studentId } });
      if (!student) {
        throw new NotFoundException(`Student with id ${studentId} not found`);
      }

      const course = await manager.findOne(Course, { where: { id: courseId } });
      if (!course) {
        throw new NotFoundException(`Course with id ${courseId} not found`);
      }

      const branchId = this.resolveEnrollmentBranch(student, course, user);

      const now = new Date();
      if (new Date(course.endDate).getTime() <= now.getTime()) {
        throw new ConflictException('Course already completed');
      }

      const existingEnrollment = await manager.findOne(Enrollment, {
        where: {
          studentId,
          courseId,
        },
      });

      if (existingEnrollment) {
        this.assertBranchAccess(existingEnrollment.branchId, user);

        if (!existingEnrollment.canceledAt && !existingEnrollment.completed) {
          throw new ConflictException('Student is already enrolled in this course');
        }

        if (existingEnrollment.completed) {
          throw new ConflictException('Student has already completed this course');
        }

        if (course.seatsAvailable <= 0) {
          throw new ConflictException('Course has no available seats');
        }

        course.seatsAvailable -= 1;
        existingEnrollment.canceledAt = null;
        existingEnrollment.completionDate = null;
        existingEnrollment.enrolledDate = now;
        existingEnrollment.completed = false;
        existingEnrollment.branchId = branchId;
        existingEnrollment.createdById = user.id;

        await manager.save(Course, course);
        return manager.save(Enrollment, existingEnrollment);
      }

      if (course.seatsAvailable <= 0) {
        throw new ConflictException('Course has no available seats');
      }

      course.seatsAvailable -= 1;

      const enrollment = manager.create(Enrollment, {
        studentId,
        courseId,
        enrolledDate: now,
        completed: false,
        branchId,
        createdById: user.id,
      });

      await manager.save(Course, course);
      return manager.save(Enrollment, enrollment);
    });

    this.logger.log(
      `Enrollment created: enrollmentId=${savedEnrollment.id} studentId=${savedEnrollment.studentId} courseId=${savedEnrollment.courseId}`,
    );

    return this.requireEnrollment(savedEnrollment.id, user, {
      student: true,
      course: true,
    });
  }

  async findAll(user: AuthUser): Promise<Enrollment[]> {
    const where =
      user.role === UserRole.SUPERADMIN
        ? {}
        : { branchId: this.getBranchIdOrThrow(user) };

    return this.enrollmentRepository.find({
      where,
      relations: {
        student: true,
        course: true,
      },
      order: {
        enrolledDate: 'DESC',
      },
    });
  }

  async findOne(id: number, user: AuthUser): Promise<Enrollment> {
    return this.requireEnrollment(id, user, {
      student: true,
      course: true,
    });
  }

  async update(
    id: number,
    updateEnrollmentDto: UpdateEnrollmentDto,
    user: AuthUser,
  ): Promise<Enrollment> {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can update enrollments directly');
    }

    const enrollment = await this.requireEnrollment(id, user);

    if (updateEnrollmentDto.studentId && updateEnrollmentDto.studentId !== enrollment.studentId) {
      const student = await this.dataSource.manager.findOne(Student, {
        where: { id: updateEnrollmentDto.studentId },
      });
      if (!student) {
        throw new NotFoundException(`Student with id ${updateEnrollmentDto.studentId} not found`);
      }
      const course = await this.dataSource.manager.findOne(Course, {
        where: { id: enrollment.courseId },
      });
      if (!course) {
        throw new NotFoundException(`Course with id ${enrollment.courseId} not found`);
      }
      enrollment.branchId = this.resolveEnrollmentBranch(student, course, user);
      enrollment.studentId = student.id;
    }

    if (updateEnrollmentDto.courseId && updateEnrollmentDto.courseId !== enrollment.courseId) {
      const course = await this.dataSource.manager.findOne(Course, {
        where: { id: updateEnrollmentDto.courseId },
      });
      if (!course) {
        throw new NotFoundException(`Course with id ${updateEnrollmentDto.courseId} not found`);
      }
      const student = await this.dataSource.manager.findOne(Student, {
        where: { id: enrollment.studentId },
      });
      if (!student) {
        throw new NotFoundException(`Student with id ${enrollment.studentId} not found`);
      }
      enrollment.branchId = this.resolveEnrollmentBranch(student, course, user);
      enrollment.courseId = course.id;
    }

    if (updateEnrollmentDto.enrolledDate !== undefined) {
      enrollment.enrolledDate = new Date(updateEnrollmentDto.enrolledDate);
    }
    if (updateEnrollmentDto.completed !== undefined) {
      enrollment.completed = updateEnrollmentDto.completed;
    }
    if (updateEnrollmentDto.completionDate !== undefined) {
      enrollment.completionDate = updateEnrollmentDto.completionDate
        ? new Date(updateEnrollmentDto.completionDate)
        : null;
    }
    if (updateEnrollmentDto.canceledAt !== undefined) {
      enrollment.canceledAt = updateEnrollmentDto.canceledAt
        ? new Date(updateEnrollmentDto.canceledAt)
        : null;
    }

    await this.enrollmentRepository.save(enrollment);
    return this.requireEnrollment(id, user, {
      student: true,
      course: true,
    });
  }

  async complete(dto: CompleteEnrollmentDto, user: AuthUser): Promise<Enrollment> {
    const enrollment = await this.requireEnrollment(dto.enrollmentId, user);
    const updated = await this.dataSource.transaction(async (manager) => {
      const record = await manager.findOne(Enrollment, { where: { id: enrollment.id } });
      if (!record) {
        throw new NotFoundException(`Enrollment with id ${enrollment.id} not found`);
      }
      if (record.canceledAt) {
        throw new BadRequestException('Cannot complete a canceled enrollment');
      }
      if (record.completed) {
        return record;
      }

      record.completed = true;
      record.completionDate = new Date();
      return manager.save(Enrollment, record);
    });

    this.logger.log(
      `Enrollment completed: enrollmentId=${updated.id} studentId=${updated.studentId} courseId=${updated.courseId}`,
    );

    return this.requireEnrollment(updated.id, user, {
      student: true,
      course: true,
    });
  }

  async unenroll(dto: UnenrollDto, user: AuthUser): Promise<Enrollment> {
    const enrollment = await this.requireEnrollment(dto.enrollmentId, user, {
      course: true,
    });

    const updated = await this.dataSource.transaction(async (manager) => {
      const record = await manager.findOne(Enrollment, {
        where: { id: enrollment.id },
        relations: { course: true },
      });
      if (!record) {
        throw new NotFoundException(`Enrollment with id ${enrollment.id} not found`);
      }
      if (record.canceledAt) {
        return record;
      }
      if (record.completed) {
        throw new BadRequestException('Cannot unenroll a completed enrollment');
      }

      const course =
        record.course ?? (await manager.findOne(Course, { where: { id: record.courseId } }));
      if (!course) {
        throw new NotFoundException(`Course with id ${record.courseId} not found`);
      }

      this.assertBranchAccess(course.branchId, user);

      course.seatsAvailable += 1;
      record.canceledAt = new Date();

      await manager.save(Course, course);
      return manager.save(Enrollment, record);
    });

    this.logger.log(
      `Enrollment canceled: enrollmentId=${updated.id} studentId=${updated.studentId} courseId=${updated.courseId}`,
    );

    return this.requireEnrollment(updated.id, user, {
      student: true,
      course: true,
    });
  }

  async findActiveEnrollments(user: AuthUser): Promise<Enrollment[]> {
    const where =
      user.role === UserRole.SUPERADMIN
        ? {
            completed: false,
            canceledAt: IsNull(),
          }
        : {
            completed: false,
            canceledAt: IsNull(),
            branchId: this.getBranchIdOrThrow(user),
          };

    return this.enrollmentRepository.find({
      where,
      relations: {
        student: true,
        course: true,
      },
      order: {
        enrolledDate: 'DESC',
      },
    });
  }

  async remove(id: number, user: AuthUser): Promise<void> {
    const enrollment = await this.requireEnrollment(id, user, {
      course: true,
    });

    await this.dataSource.transaction(async (manager) => {
      const record = await manager.findOne(Enrollment, {
        where: { id: enrollment.id },
        relations: { course: true },
      });
      if (!record) {
        throw new NotFoundException(`Enrollment with id ${id} not found`);
      }

      const course =
        record.course ?? (await manager.findOne(Course, { where: { id: record.courseId } }));
      if (course && !record.canceledAt && !record.completed) {
        course.seatsAvailable += 1;
        await manager.save(Course, course);
      }

      await manager.remove(Enrollment, record);
    });

    this.logger.log(`Enrollment removed: enrollmentId=${id}`);
  }

  private async requireEnrollment(
    id: number,
    user: AuthUser,
    relations?: Parameters<Repository<Enrollment>['findOne']>[0]['relations'],
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations,
    });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment with id ${id} not found`);
    }

    this.assertBranchAccess(enrollment.branchId, user);
    return enrollment;
  }

  private resolveEnrollmentBranch(student: Student, course: Course, user: AuthUser): number {
    if (!student.branchId || !course.branchId) {
      throw new BadRequestException('Student and course must be assigned to a branch');
    }

    if (student.branchId !== course.branchId) {
      throw new ConflictException('Student and course belong to different branches');
    }

    this.assertBranchAccess(course.branchId, user);
    return course.branchId;
  }

  private assertBranchAccess(branchId: number | null | undefined, user: AuthUser): void {
    if (user.role === UserRole.SUPERADMIN) {
      return;
    }
    const userBranchId = this.getBranchIdOrThrow(user);
    if (branchId !== userBranchId) {
      throw new ForbiddenException('Operation restricted to your branch');
    }
  }

  private getBranchIdOrThrow(user: AuthUser): number {
    if (!user.branchId) {
      throw new BadRequestException('Branch is not assigned to current user');
    }
    return user.branchId;
  }
}
