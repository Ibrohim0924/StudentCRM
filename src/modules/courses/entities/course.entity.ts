import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { dateColumnType } from '../../../config/database.constants';
import { Instructor } from '../../instructors/entities/instructor.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';

@Entity({ name: 'courses' })
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: dateColumnType })
  startDate: Date;

  @Column({ type: dateColumnType })
  endDate: Date;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'int' })
  seatsAvailable: number;

  @Column({ type: 'int', nullable: true })
  instructorId?: number | null;

  @ManyToOne(() => Instructor, (instructor) => instructor.courses, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'instructorId' })
  instructor?: Instructor | null;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @CreateDateColumn({ type: dateColumnType })
  createdAt: Date;

  @UpdateDateColumn({ type: dateColumnType })
  updatedAt: Date;
}