import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { dateColumnType } from '../../../config/database.constants';
import { Student } from '../../students/entities/student.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity({ name: 'enrollments' })
@Unique(['studentId', 'courseId'])
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  studentId: number;

  @Column({ type: 'int' })
  courseId: number;

  @ManyToOne(() => Student, (student) => student.enrollments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @ManyToOne(() => Course, (course) => course.enrollments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ type: dateColumnType })
  enrolledDate: Date;

  @Column({ default: false })
  completed: boolean;

  @Column({ type: dateColumnType, nullable: true })
  completionDate: Date | null;

  @Column({ type: dateColumnType, nullable: true })
  canceledAt: Date | null;

  @CreateDateColumn({ type: dateColumnType })
  createdAt: Date;

  @UpdateDateColumn({ type: dateColumnType })
  updatedAt: Date;
}