export interface Instructor {
  id: number;
  name: string;
  email: string;
  bio?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: number;
  name: string;
  email: string;
  enrolledAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: number;
  seatsAvailable: number;
  instructorId?: number | null;
  instructor?: Instructor | null;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: number;
  studentId: number;
  courseId: number;
  student?: Student;
  course?: Course;
  enrolledDate: string;
  completed: boolean;
  completionDate?: string | null;
  canceledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CourseStatusFilter = 'upcoming' | 'ongoing' | 'completed';

export interface ApiError {
  statusCode: number;
  message: string;
}

export interface CreateCoursePayload {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: number;
  instructorId?: number | null;
}

export interface UpdateCoursePayload extends Partial<CreateCoursePayload> {}

export interface CreateInstructorPayload {
  name: string;
  email: string;
  bio?: string;
}

export interface UpdateInstructorPayload extends Partial<CreateInstructorPayload> {}

export interface CreateStudentPayload {
  name: string;
  email: string;
  enrolledAt?: string;
}

export interface UpdateStudentPayload extends Partial<CreateStudentPayload> {}

export interface EnrollPayload {
  studentId: number;
  courseId: number;
}

export interface EnrollmentActionPayload {
  enrollmentId: number;
}
