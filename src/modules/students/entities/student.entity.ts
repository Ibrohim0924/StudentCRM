import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { dateColumnType } from '../../../config/database.constants';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';

@Entity({ name: 'students' })
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: dateColumnType })
  enrolledAt: Date;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments: Enrollment[];

  @CreateDateColumn({ type: dateColumnType })
  createdAt: Date;

  @UpdateDateColumn({ type: dateColumnType })
  updatedAt: Date;
}