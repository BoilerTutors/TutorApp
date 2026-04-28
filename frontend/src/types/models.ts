export type UserRole = "student" | "tutor" | "admin";
export type SessionMode = "online" | "in_person";

export type BoilerClass = {
  id: number;
  courseCode: string;
  title: string;
};

export type UserProfile = {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  bio?: string;
};

export type LoginResponse = {
  access_token?: string;
  token_type: string;
  mfa_required: boolean;
};

export type StudentClass = BoilerClass & {
  helpLevel: number;
};

export type TutorClass = BoilerClass & {
  semesterTaken?: string;
  gradeReceived?: string;
};

export type TutorProfile = UserProfile & {
  role: "tutor";
  averageRating: number;
  weeklySessionCap: number;
  classesTutoring: TutorClass[];
};

export type Review = {
  id: number;
  tutorId: number;
  studentId: number;
  classId: number;
  rating: number;
  comment?: string;
  createdAt: string;
};

export type TutoringSession = {
  id: number;
  tutor_id: number;
  student_id: number;
  subject: string;
  scheduled_start: string;
  scheduled_end: string;
  cost_cents: number;
  notes?: string | null;
  /** API maps legacy `confirmed` to `accepted`; `confirmed` kept for defensive parsing. */
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled" | "confirmed";
  purchased_at: string;
};

export type MockUserRole = "student" | "tutor";
