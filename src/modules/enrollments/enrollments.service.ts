import {
  BadRequestException,
  ConflictException,
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

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly dataSource: DataSource,
  ) {}

  async enroll(enrollStudentDto: EnrollStudentDto): Promise<Enrollment> {
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
      });

      await manager.save(Course, course);
      return manager.save(Enrollment, enrollment);
    });

    this.logger.log(
      `Enrollment created: enrollmentId=${savedEnrollment.id} studentId=${savedEnrollment.studentId} courseId=${savedEnrollment.courseId}`,
    );

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: savedEnrollment.id },
      relations: {
        student: true,
        course: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found after creation');
    }

    return enrollment;
  }

  async findAll(): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      relations: {
        student: true,
        course: true,
      },
      order: {
        enrolledDate: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: {
        student: true,
        course: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with id ${id} not found`);
    }

    return enrollment;
  }

  async update(id: number, updateEnrollmentDto: UpdateEnrollmentDto): Promise<Enrollment> {
    const updated = await this.dataSource.transaction(async (manager) => {
      const enrollment = await manager.findOne(Enrollment, {
        where: { id },
        relations: { course: true },
      });

      if (!enrollment) {
        throw new NotFoundException(`Enrollment with id ${id} not found`);
      }

      if (
        updateEnrollmentDto.studentId !== undefined &&
        updateEnrollmentDto.studentId !== enrollment.studentId
      ) {
        throw new ConflictException('Changing student for an enrollment is not supported');
      }

      if (
        updateEnrollmentDto.courseId !== undefined &&
        updateEnrollmentDto.courseId !== enrollment.courseId
      ) {
        throw new ConflictException('Changing course for an enrollment is not supported');
      }

      const course =
        enrollment.course ?? (await manager.findOne(Course, { where: { id: enrollment.courseId } }));
      if (!course) {
        throw new NotFoundException(`Course with id ${enrollment.courseId} not found`);
      }

      let courseChanged = false;

      if (updateEnrollmentDto.enrolledDate !== undefined) {
        enrollment.enrolledDate = new Date(updateEnrollmentDto.enrolledDate);
      }

      if (updateEnrollmentDto.completed !== undefined) {
        if (updateEnrollmentDto.completed && enrollment.canceledAt) {
          throw new ConflictException('Cannot complete a canceled enrollment');
        }

        enrollment.completed = updateEnrollmentDto.completed;
        if (updateEnrollmentDto.completed) {
          enrollment.completionDate = updateEnrollmentDto.completionDate
            ? new Date(updateEnrollmentDto.completionDate)
            : new Date();
        } else {
          if (updateEnrollmentDto.completionDate !== undefined) {
            enrollment.completionDate = updateEnrollmentDto.completionDate
              ? new Date(updateEnrollmentDto.completionDate)
              : null;
          } else {
            enrollment.completionDate = null;
          }
        }
      } else if (updateEnrollmentDto.completionDate !== undefined) {
        if (!enrollment.completed && updateEnrollmentDto.completionDate) {
          throw new ConflictException('Cannot set completionDate for an incomplete enrollment');
        }
        enrollment.completionDate = updateEnrollmentDto.completionDate
          ? new Date(updateEnrollmentDto.completionDate)
          : null;
      }

      if (updateEnrollmentDto.canceledAt !== undefined) {
        if (updateEnrollmentDto.canceledAt && enrollment.completed) {
          throw new ConflictException('Cannot cancel a completed enrollment');
        }

        const newCanceledAt = updateEnrollmentDto.canceledAt
          ? new Date(updateEnrollmentDto.canceledAt)
          : null;
        const wasCanceled = Boolean(enrollment.canceledAt);
        const willCancel = Boolean(newCanceledAt);

        if (!wasCanceled && willCancel) {
          course.seatsAvailable += 1;
          courseChanged = true;
        } else if (wasCanceled && !willCancel) {
          if (new Date(course.endDate).getTime() <= Date.now()) {
            throw new ConflictException('Course already completed');
          }
          if (course.seatsAvailable <= 0) {
            throw new ConflictException('Course has no available seats');
          }
          course.seatsAvailable -= 1;
          courseChanged = true;
        }

        enrollment.canceledAt = newCanceledAt;
      }

      if (courseChanged) {
        enrollment.course = await manager.save(Course, course);
      }

      const saved = await manager.save(Enrollment, enrollment);
      return saved;
    });

    this.logger.log(
      `Enrollment updated: enrollmentId=${updated.id} studentId=${updated.studentId} courseId=${updated.courseId}`,
    );

    return this.findOne(updated.id);
  }

  async complete(dto: CompleteEnrollmentDto): Promise<Enrollment> {
    const { enrollmentId } = dto;
    const updated = await this.dataSource.transaction(async (manager) => {
      const enrollment = await manager.findOne(Enrollment, { where: { id: enrollmentId } });
      if (!enrollment) {
        throw new NotFoundException(`Enrollment with id ${enrollmentId} not found`);
      }
      if (enrollment.canceledAt) {
        throw new BadRequestException('Cannot complete a canceled enrollment');
      }
      if (enrollment.completed) {
        return enrollment;
      }

      enrollment.completed = true;
      enrollment.completionDate = new Date();
      return manager.save(Enrollment, enrollment);
    });

    this.logger.log(
      `Enrollment completed: enrollmentId=${updated.id} studentId=${updated.studentId} courseId=${updated.courseId}`,
    );

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: updated.id },
      relations: {
        student: true,
        course: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found after completion');
    }

    return enrollment;
  }

  async unenroll(dto: UnenrollDto): Promise<Enrollment> {
    const { enrollmentId } = dto;

    const updated = await this.dataSource.transaction(async (manager) => {
      const enrollment = await manager.findOne(Enrollment, {
        where: { id: enrollmentId },
        relations: { course: true },
      });
      if (!enrollment) {
        throw new NotFoundException(`Enrollment with id ${enrollmentId} not found`);
      }
      if (enrollment.canceledAt) {
        return enrollment;
      }
      if (enrollment.completed) {
        throw new BadRequestException('Cannot unenroll a completed enrollment');
      }

      const course =
        enrollment.course ?? (await manager.findOne(Course, { where: { id: enrollment.courseId } }));
      if (!course) {
        throw new NotFoundException(`Course with id ${enrollment.courseId} not found`);
      }

      course.seatsAvailable += 1;
      enrollment.canceledAt = new Date();

      await manager.save(Course, course);
      return manager.save(Enrollment, enrollment);
    });

    this.logger.log(
      `Enrollment canceled: enrollmentId=${updated.id} studentId=${updated.studentId} courseId=${updated.courseId}`,
    );

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: updated.id },
      relations: {
        student: true,
        course: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found after cancelation');
    }

    return enrollment;
  }

  async findActiveEnrollments(): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: {
        completed: false,
        canceledAt: IsNull(),
      },
      relations: {
        student: true,
        course: true,
      },
      order: {
        enrolledDate: 'DESC',
      },
    });
  }

  async remove(id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const enrollment = await manager.findOne(Enrollment, {
        where: { id },
        relations: { course: true },
      });
      if (!enrollment) {
        throw new NotFoundException(`Enrollment with id ${id} not found`);
      }

      const course =
        enrollment.course ?? (await manager.findOne(Course, { where: { id: enrollment.courseId } }));
      if (course && !enrollment.canceledAt && !enrollment.completed) {
        course.seatsAvailable += 1;
        await manager.save(Course, course);
      }

      await manager.remove(Enrollment, enrollment);
    });

    this.logger.log(`Enrollment removed: enrollmentId=${id}`);
  }
}
