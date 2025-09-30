import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnrollmentsService } from './enrollments.service';
import { Enrollment } from './entities/enrollment.entity';
import { Student } from '../students/entities/student.entity';
import { Course } from '../courses/entities/course.entity';
import { Instructor } from '../instructors/entities/instructor.entity';

describe('EnrollmentsService', () => {
  let moduleRef: TestingModule;
  let service: EnrollmentsService;
  let courseRepository: Repository<Course>;
  let studentRepository: Repository<Student>;
  let enrollmentRepository: Repository<Enrollment>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [Course, Student, Enrollment, Instructor],
        }),
        TypeOrmModule.forFeature([Enrollment, Student, Course]),
      ],
      providers: [EnrollmentsService],
    }).compile();

    service = moduleRef.get(EnrollmentsService);
    courseRepository = moduleRef.get(getRepositoryToken(Course));
    studentRepository = moduleRef.get(getRepositoryToken(Student));
    enrollmentRepository = moduleRef.get(getRepositoryToken(Enrollment));
  });

  beforeEach(async () => {
    await enrollmentRepository.query('DELETE FROM enrollments');
    await courseRepository.query('DELETE FROM courses');
    await studentRepository.query('DELETE FROM students');
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('enrolls a student when seats are available', async () => {
    const course = await courseRepository.save(
      courseRepository.create({
        title: 'Math 101',
        description: 'Basic math',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        capacity: 2,
        seatsAvailable: 2,
      }),
    );
    const student = await studentRepository.save(
      studentRepository.create({
        name: 'Alice',
        email: 'alice@example.com',
        enrolledAt: new Date(),
      }),
    );

    const enrollment = await service.enroll({ studentId: student.id, courseId: course.id });

    const updatedCourse = await courseRepository.findOne({ where: { id: course.id } });

    expect(enrollment).toBeDefined();
    expect(enrollment.student.id).toBe(student.id);
    expect(updatedCourse?.seatsAvailable).toBe(1);
  });

  it('fails to enroll when the course is full', async () => {
    const course = await courseRepository.save(
      courseRepository.create({
        title: 'Physics 101',
        description: 'Intro physics',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        capacity: 1,
        seatsAvailable: 1,
      }),
    );
    const studentA = await studentRepository.save(
      studentRepository.create({
        name: 'Bob',
        email: 'bob@example.com',
        enrolledAt: new Date(),
      }),
    );
    const studentB = await studentRepository.save(
      studentRepository.create({
        name: 'Charlie',
        email: 'charlie@example.com',
        enrolledAt: new Date(),
      }),
    );

    await service.enroll({ studentId: studentA.id, courseId: course.id });

    await expect(service.enroll({ studentId: studentB.id, courseId: course.id })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('fails to enroll when the course already ended', async () => {
    const course = await courseRepository.save(
      courseRepository.create({
        title: 'History 101',
        description: 'World history',
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        capacity: 10,
        seatsAvailable: 10,
      }),
    );
    const student = await studentRepository.save(
      studentRepository.create({
        name: 'Diana',
        email: 'diana@example.com',
        enrolledAt: new Date(),
      }),
    );

    await expect(service.enroll({ studentId: student.id, courseId: course.id })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});