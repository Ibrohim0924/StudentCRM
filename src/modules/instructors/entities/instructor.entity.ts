import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { dateColumnType } from '../../../config/database.constants';
import { Course } from '../../courses/entities/course.entity';

@Entity({ name: 'instructors' })
export class Instructor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  bio?: string | null;

  @OneToMany(() => Course, (course) => course.instructor)
  courses: Course[];

  @CreateDateColumn({ type: dateColumnType })
  createdAt: Date;

  @UpdateDateColumn({ type: dateColumnType })
  updatedAt: Date;
}