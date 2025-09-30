import {
  BadRequestException,
  ConflictException,
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
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const { startDate, endDate, instructorId, capacity } = createCourseDto;
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);

    if (parsedStart >= parsedEnd) {
      throw new BadRequestException('startDate must be earlier than endDate');
    }

    let instructor: Instructor | null = null;
    if (instructorId) {
      instructor = await this.instructorRepository.findOne({ where: { id: instructorId } });
      if (!instructor) {
        throw new NotFoundException(`Instructor with id ${instructorId} not found`);
      }
    }

    const course = this.courseRepository.create({
      title: createCourseDto.title,
      description: createCourseDto.description,
      startDate: parsedStart,
      endDate: parsedEnd,
      capacity,
      seatsAvailable: capacity,
      instructorId: instructor?.id ?? null,
    });

    if (instructor) {
      course.instructor = instructor;
    }

    const saved = await this.courseRepository.save(course);
    this.logger.log(`Course created: courseId=${saved.id} instructorId=${saved.instructorId ?? 'none'}`);
    return this.findOne(saved.id);
  }

  async findAll(filter: CourseFilterDto): Promise<Course[]> {
    const courses = await this.courseRepository.find({
      relations: { instructor: true },
      order: { startDate: 'ASC' },
    });

    if (!filter?.status) {
      return courses;
    }

    const now = new Date();
    return courses.filter((course) => this.matchStatus(course, now) === filter.status);
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: {
        instructor: true,
        enrollments: {
          student: true,
        },
      },
    });
    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }
    return course;
  }

  async getRoster(id: number): Promise<Enrollment[]> {
    await this.requireCourse(id);
    return this.enrollmentRepository.find({
      where: { courseId: id, canceledAt: IsNull() },
      relations: {
        student: true,
      },
      order: {
        enrolledDate: 'ASC',
      },
    });
  }

  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.requireCourse(id);

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
        const instructor = await this.instructorRepository.findOne({
          where: { id: updateCourseDto.instructorId },
        });
        if (!instructor) {
          throw new NotFoundException(`Instructor with id ${updateCourseDto.instructorId} not found`);
        }
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
    return this.findOne(saved.id);
  }

  async remove(id: number): Promise<void> {
    const course = await this.requireCourse(id);

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

  private async requireCourse(id: number): Promise<Course> {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }
    return course;
  }
}