export type UserRole = 'superadmin' | 'admin' | 'user';

export interface Branch {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Instructor {
  id: number;
  name: string;
  email: string;
  bio?: string | null;
  branchId?: number | null;
  branch?: Branch | null;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: number;
  name: string;
  email: string;
  enrolledAt: string;
  branchId?: number | null;
  branch?: Branch | null;
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
  branchId?: number | null;
  branch?: Branch | null;
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
  branchId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  branchId?: number | null;
  branch?: Branch | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
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
  branchId?: number;
}

export interface UpdateCoursePayload extends Partial<CreateCoursePayload> {}

export interface CreateInstructorPayload {
  name: string;
  email: string;
  bio?: string;
  branchId?: number;
}

export interface UpdateInstructorPayload extends Partial<CreateInstructorPayload> {}

export interface CreateStudentPayload {
  name: string;
  email: string;
  enrolledAt?: string;
  branchId?: number;
}

export interface UpdateStudentPayload extends Partial<CreateStudentPayload> {}

export interface EnrollPayload {
  studentId: number;
  courseId: number;
}

export interface EnrollmentActionPayload {
  enrollmentId: number;
}

export interface UpdateEnrollmentPayload {
  studentId?: number;
  courseId?: number;
  enrolledDate?: string;
  completed?: boolean;
  completionDate?: string | null;
  canceledAt?: string | null;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  fullName: string;
  email: string;
  password: string;
  branchId: number;
}

export interface CreateAdminPayload {
  fullName: string;
  email: string;
  password: string;
  branchId: number;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  branchId?: number;
}
