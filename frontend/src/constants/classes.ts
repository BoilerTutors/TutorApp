/** Mock Purdue classes - fallback when backend classes API returns empty */
export const AVAILABLE_CLASSES_FALLBACK = [
  { id: 1, courseCode: "CS 180", title: "Problem Solving And Object-Oriented Programming" },
  { id: 2, courseCode: "CS 182", title: "Foundations of Computer Science" },
  { id: 3, courseCode: "CS 240", title: "Programming in C" },
  { id: 4, courseCode: "CS 250", title: "Computer Architecture" },
  { id: 5, courseCode: "CS 251", title: "Data Structures and Algorithms" },
  { id: 6, courseCode: "CS 307", title: "Software Engineering I" },
  { id: 7, courseCode: "CS 354", title: "Operating Systems" },
  { id: 8, courseCode: "CS 373", title: "Data Mining & Machine Learning" },
  { id: 9, courseCode: "CS 407", title: "Software Engineering II" },
  { id: 10, courseCode: "MA 161", title: "Plane Analytic Geometry And Calculus I" },
  { id: 11, courseCode: "MA 162", title: "Plane Analytic Geometry And Calculus II" },
  { id: 12, courseCode: "MA 265", title: "Linear Algebra" },
  { id: 13, courseCode: "PHYS 172", title: "Modern Mechanics" },
  { id: 14, courseCode: "PHYS 272", title: "Electric and Magnetic Interactions" },
];

export const GRADE_OPTIONS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C"];

export const SEMESTER_OPTIONS = ["Fall 2025", "Spring 2025", "Fall 2024", "Spring 2024", "Fall 2023", "Spring 2023"];

export const PURDUE_LOCATIONS = [
  "Lawson Computer Science Building",
  "Wilmeth Active Learning Center (WALC)",
  "Hicks Undergraduate Library",
  "Stewart Center",
  "Physics Building",
  "Mathematical Sciences Building",
  "PMU (Purdue Memorial Union)",
];

export const HELP_TYPE_OPTIONS = [
  "Concept review",
  "Homework help",
  "Exam prep",
  "Assignment debugging",
  "Other",
];
