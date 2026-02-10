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

export type MockUserRole = "student" | "tutor";
