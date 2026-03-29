// API types and wrappers that use the existing api client
import { api } from "../api/client";

// Types matching backend schemas
export type UserCreate = {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  is_tutor: boolean;
  is_student: boolean;
  tutor_profile?: TutorProfileCreate;
  student_profile?: StudentProfileCreate;
};

export type TutorProfileCreate = {
  bio?: string;
  hourly_rate_cents?: number;
  major?: string;
  grad_year?: number;
};

export type StudentProfileCreate = {
  major?: string;
  grad_year?: number;
};

export type TutorClassCreate = {
  class_id: number;
  semester: "F" | "S";
  year_taken: number;
  grade_received: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type Token = {
  access_token: string;
  token_type: string;
};

export type UserPublic = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_tutor: boolean;
  is_student: boolean;
  created_at: string;
  tutor?: TutorProfilePublic;
  student?: StudentProfilePublic;
};

export type TutorProfilePublic = {
  id: number;
  user_id: number;
  bio?: string;
  hourly_rate_cents?: number;
  major?: string;
  grad_year?: number;
  average_rating?: number;
};

export type StudentProfilePublic = {
  id: number;
  user_id: number;
  major?: string;
  grad_year?: number;
};

export type ClassPublic = {
  id: number;
  subject: string;
  class_number: number;
  professor: string;
};

export type TutorClassPublic = {
  id: number;
  tutor_id: number;
  class_id: number;
  semester: "F" | "S";
  year_taken: number;
  grade_received: string;
};

export type ReviewCreate = {
  session_id: number;
  class_id: number;
  rating: number;
  comment?: string;
  is_anonymous: boolean;
};

export type ReviewUpdate = {
  rating?: number;
  comment?: string;
  is_anonymous?: boolean;
};

export type ReviewPublic = {
  id: number;
  session_id: number;
  class_id: number;
  rating: number;
  comment?: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
};

export type TutoringSessionPublic = {
  id: number;
  tutor_id: number;
  student_id: number;
  subject: string;
  scheduled_start: string;
  scheduled_end: string;
  cost_cents: number;
  notes?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  purchased_at: string;
};

// Auth API - uses the global api client which handles token automatically
export const authApi = {
  login: (data: LoginRequest) => api.post<Token>("/auth/login", data),
  getMe: () => api.get<UserPublic>("/users/me"),
};

// Users API
export const usersApi = {
  register: (data: UserCreate) => api.post<UserPublic>("/users/", data),
};

// Classes API
export const classesApi = {
  list: (subject?: string) => {
    const query = subject ? `?subject=${subject}` : "";
    return api.get<ClassPublic[]>(`/classes/${query}`);
  },
  getById: (classId: number) => api.get<ClassPublic>(`/classes/${classId}`),
  addTutorClass: (data: TutorClassCreate) => api.post<TutorClassPublic>("/classes/tutor/", data),
  getMyTutorClasses: () => api.get<TutorClassPublic[]>("/classes/tutor/me"),
  deleteTutorClass: (tutorClassId: number) => api.delete<void>(`/classes/tutor/${tutorClassId}`),
};

// Reviews API
export const reviewsApi = {
  create: (data: ReviewCreate) => api.post<ReviewPublic>("/reviews/", data),
  getById: (reviewId: number) => api.get<ReviewPublic>(`/reviews/${reviewId}`),
  getForTutor: (userId: number) => api.get<ReviewPublic[]>(`/reviews/tutor/${userId}`),
  getMyReviews: () => api.get<ReviewPublic[]>("/reviews/student/me"),
  update: (reviewId: number, data: ReviewUpdate) => api.patch<ReviewPublic>(`/reviews/${reviewId}`, data),
  delete: (reviewId: number) => api.delete<void>(`/reviews/${reviewId}`),
};

// Sessions API
export const sessionsApi = {
  getMySessions: () => api.get<TutoringSessionPublic[]>("/sessions/me").catch(() => []),
  getMySessionsAsStudent: () => api.get<TutoringSessionPublic[]>("/sessions/student/me").catch(() => []),
  getMySessionsAsTutor: () => api.get<TutoringSessionPublic[]>("/sessions/tutor/me").catch(() => []),
};
