import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata"),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  applicantName: text("applicant_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  organization: text("organization"),
  department: text("department"),
  position: text("position"),
  fileName: text("file_name").notNull(),
  filePath: text("file_path"),
  fileHash: text("file_hash"),
  status: text("status").default("submitted").notNull(),
  evaluationResult: jsonb("evaluation_result"),
  totalScore: integer("total_score"),
  verdict: text("verdict"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  selectionId: uuid("selection_id"),
});

export const evaluations = pgTable("evaluations", {
  id: uuid("id").primaryKey(),
  applicantName: text("applicant_name").default("이름 미확인").notNull(),
  organization: text("organization").default("소속 미확인").notNull(),
  orgType: text("org_type"),
  fileName: text("file_name"),
  fileHash: text("file_hash"),
  documentChecks: jsonb("document_checks").default([]),
  documentVerdict: text("document_verdict"),
  documentNote: text("document_note"),
  motivation: jsonb("motivation"),
  experience: jsonb("experience"),
  axPlan: jsonb("ax_plan"),
  axDetails: jsonb("ax_details").default([]),
  certifications: jsonb("certifications").default([]),
  strengths: jsonb("strengths").default([]),
  improvements: jsonb("improvements").default([]),
  totalScore: integer("total_score"),
  verdict: text("verdict").default("탈락 권고"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const examAttempts = pgTable("exam_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id").notNull(),
  userId: uuid("user_id"),
  applicantName: text("applicant_name"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  answers: jsonb("answers").default({}),
  score: integer("score"),
  isPassed: boolean("is_passed"),
});

export const examCaptureRequests = pgTable("exam_capture_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  targetUserId: uuid("target_user_id").notNull(),
  requestedBy: uuid("requested_by").notNull(),
  examId: uuid("exam_id").notNull(),
  status: text("status").default("pending").notNull(),
  incidentId: uuid("incident_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }),
});

export const examQuestions = pgTable("exam_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id").notNull(),
  questionId: uuid("question_id").notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
  points: integer("points").default(5).notNull(),
});

export const exams = pgTable("exams", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  timeLimitMinutes: integer("time_limit_minutes").default(60).notNull(),
  passingScore: integer("passing_score").default(60).notNull(),
  targetRole: text("target_role").default("applicant").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  selectionId: uuid("selection_id"),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  displayName: text("display_name"),
  fullName: text("full_name"),
});

export const questionBank = pgTable("question_bank", {
  id: uuid("id").defaultRandom().primaryKey(),
  category: text("category").default("일반").notNull(),
  difficulty: text("difficulty").default("중").notNull(),
  type: text("type").default("객관식").notNull(),
  content: text("content").notNull(),
  options: jsonb("options"),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  testCases: jsonb("test_cases"),
  attachments: jsonb("attachments").default([]),
});

export const selections = pgTable("selections", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("draft").notNull(),
  applyStart: timestamp("apply_start", { withTimezone: true }),
  applyEnd: timestamp("apply_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  hasWrittenEval: boolean("has_written_eval").default(true),
  hasExam: boolean("has_exam").default(true),
  examFirst: boolean("exam_first").default(false),
});
