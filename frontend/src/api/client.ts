import {
  ApiError,
  Course,
  CourseStatusFilter,
  CreateCoursePayload,
  CreateInstructorPayload,
  UpdateInstructorPayload,
  CreateStudentPayload,
  EnrollPayload,
  Enrollment,
  EnrollmentActionPayload,
  Instructor,
  Student,
  UpdateCoursePayload,
  UpdateStudentPayload,
} from './types';

const API_URL = (import.meta.env.VITE_API_URL as string) ?? '/api';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const responseCache = new Map<string, unknown>();

const resolveMethod = (options: RequestInit): HttpMethod =>
  ((options.method ?? 'GET').toString().toUpperCase() as HttpMethod);

const shouldAppendCacheBuster = (method: HttpMethod) => method === 'GET';

const appendCacheBuster = (path: string): string => {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}_ts=${Date.now()}`;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = resolveMethod(options);
  const cacheKey = `${method} ${path}`;

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  headers.set('Pragma', 'no-cache');

  const finalPath = shouldAppendCacheBuster(method) ? appendCacheBuster(path) : path;

  const response = await fetch(`${API_URL}${finalPath}`, {
    cache: 'no-store',
    ...options,
    method,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : undefined;

  const isSuccess = response.ok || response.status === 304;

  if (!isSuccess) {
    const error: ApiError = {
      statusCode: response.status,
      message: payload?.message ?? 'Server xatosi',
    };
    throw error;
  }

  if (payload !== undefined) {
    responseCache.set(cacheKey, payload);
    return payload as T;
  }

  if (response.status === 304 && responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey) as T;
  }

  // no payload (e.g. DELETE 204) – return undefined as T
  return undefined as T;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const api = {
  getCourses: (status?: CourseStatusFilter) => request<Course[]>(`/courses${buildQuery({ status })}`),

  getCourse: (id: number) => request<Course>(`/courses/${id}`),

  createCourse: (payload: CreateCoursePayload) =>
    request<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCourse: (id: number, payload: UpdateCoursePayload) =>
    request<Course>(`/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteCourse: (id: number) =>
    request<void>(`/courses/${id}`, {
      method: 'DELETE',
    }),

  getInstructors: () => request<Instructor[]>('/instructors'),

  createInstructor: (payload: CreateInstructorPayload) =>
    request<Instructor>('/instructors', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateInstructor: (id: number, payload: UpdateInstructorPayload) =>
    request<Instructor>(`/instructors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteInstructor: (id: number) =>
    request<void>(`/instructors/${id}`, {
      method: 'DELETE',
    }),

  getInstructorCourses: (id: number) => request<Course[]>(`/instructors/${id}/courses`),

  getStudents: () => request<Student[]>('/students'),

  createStudent: (payload: CreateStudentPayload) =>
    request<Student>('/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStudent: (id: number, payload: UpdateStudentPayload) =>
    request<Student>(`/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteStudent: (id: number) =>
    request<void>(`/students/${id}`, {
      method: 'DELETE',
    }),

  getStudentProfile: (id: number) =>
    request<{
      student: Student;
      activeEnrollments: Enrollment[];
      completedEnrollments: Enrollment[];
      canceledEnrollments: Enrollment[];
    }>(`/students/${id}`),

  getStudentHistory: (id: number) => request<Enrollment[]>(`/students/${id}/history`),

  enrollStudent: (payload: EnrollPayload) =>
    request<Enrollment>('/enroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  completeEnrollment: (payload: EnrollmentActionPayload) =>
    request<Enrollment>('/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cancelEnrollment: (payload: EnrollmentActionPayload) =>
    request<Enrollment>('/unenroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getActiveEnrollments: () => request<Enrollment[]>('/enrollments/active'),
};

export type { Course, Instructor, Student, Enrollment };
