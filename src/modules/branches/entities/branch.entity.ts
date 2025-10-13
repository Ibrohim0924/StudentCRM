import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { dateColumnType } from '../../../config/database.constants';
import { User } from '../../users/entities/user.entity';
import { Student } from '../../students/entities/student.entity';
import { Course } from '../../courses/entities/course.entity';
import { Instructor } from '../../instructors/entities/instructor.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';

@Entity({ name: 'branches' })
export class Branch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, unique: true })
  name: string;

  @OneToMany(() => User, (user) => user.branch)
  users: User[];

  @OneToMany(() => Student, (student) => student.branch)
  students: Student[];

  @OneToMany(() => Course, (course) => course.branch)
  courses: Course[];

  @OneToMany(() => Instructor, (instructor) => instructor.branch)
  instructors: Instructor[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.branch)
  enrollments: Enrollment[];

  @CreateDateColumn({ type: dateColumnType })
  createdAt: Date;

  @UpdateDateColumn({ type: dateColumnType })
  updatedAt: Date;
}
