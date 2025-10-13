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
import { Branch } from '../../branches/entities/branch.entity';
import { Course } from '../../courses/entities/course.entity';
import { Student } from '../../students/entities/student.entity';
import { Instructor } from '../../instructors/entities/instructor.entity';

export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  USER = 'user',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'int', nullable: true })
  branchId?: number | null;

  @ManyToOne(() => Branch, (branch) => branch.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch | null;

  @OneToMany(() => Course, (course) => course.createdBy)
  createdCourses: Course[];

  @OneToMany(() => Student, (student) => student.createdBy)
  createdStudents: Student[];

  @OneToMany(() => Instructor, (instructor) => instructor.createdBy)
  createdInstructors: Instructor[];

  @CreateDateColumn({ type: dateColumnType })
  createdAt: Date;

  @UpdateDateColumn({ type: dateColumnType })
  updatedAt: Date;
}
