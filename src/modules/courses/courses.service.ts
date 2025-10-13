
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseFilterDto, CourseStatus } from './dto/course-filter.dto';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Instructor } from '../instructors/entities/instructor.entity';
import { Branch } from '../branches/entities/branch.entity';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async create(createCourseDto: CreateCourseDto, user: AuthUser): Promise<Course> {
    const { startDate, endDate, instructorId, capacity } = createCourseDto;
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);

    if (parsedStart >= parsedEnd) {
      throw new BadRequestException('startDate must be earlier than endDate');
    }

    const branchId = await this.resolveBranchForWrite(createCourseDto.branchId, user);

    let instructor: Instructor | null = null;
    if (instructorId) {
      instructor = await this.ensureInstructorWithinBranch(instructorId, branchId);
    }

    const course = this.courseRepository.create({
      title: createCourseDto.title,
      description: createCourseDto.description,
      startDate: parsedStart,
      endDate: parsedEnd,
      capacity,
      seatsAvailable: capacity,
      instructorId: instructor?.id ?? null,
      branchId,
      createdById: user.id,
    });

    if (instructor) {
      course.instructor = instructor;
    }

    const saved = await this.courseRepository.save(course);
    this.logger.log(
      `Course created: courseId=${saved.id} branchId=${branchId} instructorId=${saved.instructorId ?? 'none'}`,
    );
    return this.findOne(saved.id, user);
  }

  async findAll(filter: CourseFilterDto, user: AuthUser): Promise<Course[]> {
    const where =
      user.role === UserRole.SUPERADMIN
        ? {}
        : {
            branchId: this.getBranchIdOrThrow(user),
          };

    const courses = await this.courseRepository.find({
      where,
      relations: { instructor: true, branch: true },
      order: { startDate: 'ASC' },
    });

    if (!filter?.status) {
      return courses;
    }

    const now = new Date();
    return courses.filter((course) => this.matchStatus(course, now) === filter.status);
  }

  async findOne(id: number, user: AuthUser): Promise<Course> {
    return this.requireCourse(id, user, {
      instructor: true,
      branch: true,
      enrollments: {
        student: true,
      },
    });
  }

  async getRoster(id: number, user: AuthUser): Promise<Enrollment[]> {
    const course = await this.requireCourse(id, user);
    return this.enrollmentRepository.find({
      where: { courseId: course.id, canceledAt: IsNull() },
      relations: {
        student: true,
      },
      order: {
        enrolledDate: 'ASC',
      },
    });
  }

  async update(id: number, updateCourseDto: UpdateCourseDto, user: AuthUser): Promise<Course> {
    const course = await this.requireCourse(id, user, { instructor: true });

    if (updateCourseDto.branchId !== undefined) {
      if (user.role !== UserRole.SUPERADMIN) {
        throw new ForbiddenException('Only superadmin can change branch');
      }
      if (course.branchId !== updateCourseDto.branchId) {
        await this.verifyBranch(updateCourseDto.branchId);
        course.branchId = updateCourseDto.branchId;
      }
    }

    if (updateCourseDto.startDate) {
      course.startDate = new Date(updateCourseDto.startDate);
    }

    if (updateCourseDto.endDate) {
      course.endDate = new Date(updateCourseDto.endDate);
    }

    if (course.startDate >= course.endDate) {
      throw new BadRequestException('startDate must be earlier than endDate');
    }

    const now = new Date();
    const isCompleted = new Date(course.endDate).getTime() <= now.getTime();

    if (updateCourseDto.title !== undefined) {
      course.title = updateCourseDto.title;
    }
    if (updateCourseDto.description !== undefined) {
      course.description = updateCourseDto.description;
    }

    if (updateCourseDto.instructorId !== undefined) {
      if (isCompleted && updateCourseDto.instructorId !== course.instructorId) {
        throw new ConflictException('Cannot change instructor for a completed course');
      }

      if (updateCourseDto.instructorId === null) {
        course.instructorId = null;
        course.instructor = null;
      } else {
        const instructor = await this.ensureInstructorWithinBranch(
          updateCourseDto.instructorId,
          course.branchId ?? (user.branchId ?? null) ?? undefined,
        );
        course.instructorId = instructor.id;
        course.instructor = instructor;
      }
    }

    if (updateCourseDto.capacity !== undefined) {
      const activeEnrollments = await this.enrollmentRepository.count({
        where: { courseId: id, canceledAt: IsNull() },
      });

      if (updateCourseDto.capacity < activeEnrollments) {
        this.logger.warn(
          `Capacity for course ${id} lowered below active enrollment count (${activeEnrollments}). seatsAvailable set to 0.`,
        );
      }

      course.capacity = updateCourseDto.capacity;
      course.seatsAvailable = Math.max(0, updateCourseDto.capacity - activeEnrollments);
    }

    const saved = await this.courseRepository.save(course);
    return this.findOne(saved.id, user);
  }

  async remove(id: number, user: AuthUser): Promise<void> {
    const course = await this.requireCourse(id, user);

    const activeEnrollments = await this.enrollmentRepository.count({
      where: { courseId: id, canceledAt: IsNull() },
    });

    if (activeEnrollments > 0) {
      throw new ConflictException('Cannot delete a course with active enrollments');
    }

    await this.courseRepository.remove(course);
    this.logger.log(`Course deleted: courseId=${id}`);
  }

  private matchStatus(course: Course, now: Date): CourseStatus {
    if (now < course.startDate) {
      return 'upcoming';
    }
    if (now > course.endDate) {
      return 'completed';
    }
    return 'ongoing';
  }

  private async requireCourse(
    id: number,
    user?: AuthUser,
    relations?: Parameters<Repository<Course>['findOne']>[0]['relations'],
  ): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations,
    });
    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }

    if (user && user.role !== UserRole.SUPERADMIN) {
      const branchId = this.getBranchIdOrThrow(user);
      if (course.branchId !== branchId) {
        throw new ForbiddenException('Access to this course is not allowed');
      }
    }

    return course;
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
      throw new ForbiddenException('You can only manage courses within your branch');
    }
    return branchId;
  }

  private async ensureInstructorWithinBranch(
    instructorId: number,
    branchId?: number | null | undefined,
  ): Promise<Instructor> {
    const instructor = await this.instructorRepository.findOne({
      where: { id: instructorId },
    });
    if (!instructor) {
      throw new NotFoundException(`Instructor with id ${instructorId} not found`);
    }

    if (branchId) {
      if (instructor.branchId && instructor.branchId !== branchId) {
        throw new ForbiddenException('Instructor belongs to another branch');
      }
    }

    return instructor;
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
