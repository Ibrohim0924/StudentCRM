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
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';

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

  @Column({ type: 'int', nullable: true })
  branchId?: number | null;

  @ManyToOne(() => Branch, (branch) => branch.courses, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch | null;

  @Column({ type: 'int', nullable: true, select: false })
  createdById?: number | null;

  @ManyToOne(() => User, (user) => user.createdCourses, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User | null;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @CreateDateColumn({ type: dateColumnType })
  createdAt: Date;

  @UpdateDateColumn({ type: dateColumnType })
  updatedAt: Date;
}
