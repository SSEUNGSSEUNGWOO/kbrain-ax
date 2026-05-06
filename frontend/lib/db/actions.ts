"use server"

import { db } from "@/lib/db"
import {
  selections,
  applications,
  examAttempts,
  activityLogs,
  profiles,
  exams,
  examQuestions,
  questionBank,
  examCaptureRequests,
} from "@/lib/db/schema"
import { eq, desc, asc, and, inArray, sql, count } from "drizzle-orm"

// ── Selections ──────────────────────────────────────────────

export async function getSelections() {
  return db.select().from(selections).orderBy(desc(selections.createdAt))
}

export async function getRecentSelections(limit = 3) {
  return db
    .select({
      id: selections.id,
      title: selections.title,
      status: selections.status,
      applyEnd: selections.applyEnd,
    })
    .from(selections)
    .orderBy(desc(selections.createdAt))
    .limit(limit)
}

export async function getSelectionById(id: string) {
  const rows = await db.select().from(selections).where(eq(selections.id, id)).limit(1)
  return rows[0] ?? null
}

export async function createSelection() {
  const rows = await db
    .insert(selections)
    .values({
      title: "새 선발 전형",
      description: "",
      status: "draft",
      applyStart: new Date(),
      applyEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      hasWrittenEval: true,
      hasExam: false,
      examFirst: false,
    })
    .returning()
  return rows[0]
}

// ── Applications ────────────────────────────────────────────

export async function getAllApplications() {
  return db.select({ status: applications.status, createdAt: applications.createdAt }).from(applications)
}

export async function getApplicationsBySelectionId(selectionId: string) {
  return db
    .select()
    .from(applications)
    .where(eq(applications.selectionId, selectionId))
    .orderBy(desc(applications.createdAt))
}

export async function getLatestApplicationByUserId(userId: string) {
  const rows = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt))
    .limit(1)
  return rows[0] ?? null
}

export async function updateApplicationStatus(appId: string, newStatus: string) {
  await db.update(applications).set({ status: newStatus }).where(eq(applications.id, appId))
}

// ── Exam Attempts ───────────────────────────────────────────

export async function getAllExamAttemptScores() {
  return db.select({ score: examAttempts.score }).from(examAttempts)
}

export async function getExamAttemptsByUserId(userId: string) {
  return db
    .select({
      id: examAttempts.id,
      examId: examAttempts.examId,
      score: examAttempts.score,
      isPassed: examAttempts.isPassed,
      submittedAt: examAttempts.submittedAt,
    })
    .from(examAttempts)
    .where(eq(examAttempts.userId, userId))
    .orderBy(desc(examAttempts.submittedAt))
}

export async function getExamAttemptsByUserIdWithExamTitle(userId: string, limit = 3) {
  return db
    .select({
      id: examAttempts.id,
      examId: examAttempts.examId,
      score: examAttempts.score,
      isPassed: examAttempts.isPassed,
      submittedAt: examAttempts.submittedAt,
      examTitle: exams.title,
    })
    .from(examAttempts)
    .leftJoin(exams, eq(examAttempts.examId, exams.id))
    .where(eq(examAttempts.userId, userId))
    .orderBy(desc(examAttempts.submittedAt))
    .limit(limit)
}

// ── Activity Logs ───────────────────────────────────────────

export async function getRecentActivityLogs(limit = 5) {
  return db
    .select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      eventType: activityLogs.eventType,
      createdAt: activityLogs.createdAt,
      metadata: activityLogs.metadata,
    })
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
}

export async function getActivityLogsByExamId(examId: string, limit = 200) {
  return db
    .select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      eventType: activityLogs.eventType,
      metadata: activityLogs.metadata,
      videoUrl: activityLogs.videoUrl,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .where(sql`${activityLogs.metadata}->>'exam_id' = ${examId}`)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
}

export async function insertActivityLog(data: {
  userId: string
  eventType: string
  metadata?: Record<string, unknown>
}) {
  const rows = await db
    .insert(activityLogs)
    .values({
      userId: data.userId,
      eventType: data.eventType,
      metadata: data.metadata ?? null,
    })
    .returning({ id: activityLogs.id })
  return rows[0] ?? null
}

export async function updateActivityLogVideoUrl(logId: string, videoUrl: string) {
  await db.update(activityLogs).set({ videoUrl }).where(eq(activityLogs.id, logId))
}

// ── Profiles ────────────────────────────────────────────────

export async function getProfilesByIds(ids: string[]) {
  if (ids.length === 0) return []
  return db
    .select({ id: profiles.id, fullName: profiles.fullName })
    .from(profiles)
    .where(inArray(profiles.id, ids))
}

export async function getProfileById(id: string) {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1)
  return rows[0] ?? null
}

// ── Exams ───────────────────────────────────────────────────

export async function getActiveExams() {
  return db
    .select({
      id: exams.id,
      title: exams.title,
      timeLimitMinutes: exams.timeLimitMinutes,
      passingScore: exams.passingScore,
    })
    .from(exams)
    .where(eq(exams.isActive, true))
    .orderBy(desc(exams.createdAt))
}

export async function getExamById(examId: string) {
  const rows = await db.select().from(exams).where(eq(exams.id, examId)).limit(1)
  return rows[0] ?? null
}

export async function getExamsBySelectionId(selectionId: string) {
  return db.select().from(exams).where(eq(exams.selectionId, selectionId)).orderBy(desc(exams.createdAt))
}

export async function createExam(data: {
  title: string
  description: string
  timeLimitMinutes: number
  passingScore: number
  selectionId: string
  isActive: boolean
}) {
  const rows = await db
    .insert(exams)
    .values({
      title: data.title,
      description: data.description,
      timeLimitMinutes: data.timeLimitMinutes,
      passingScore: data.passingScore,
      selectionId: data.selectionId,
      isActive: data.isActive,
    })
    .returning()
  return rows[0]
}

// ── Exam Questions ──────────────────────────────────────────

export async function getExamQuestionsWithDetails(examId: string) {
  return db
    .select({
      id: examQuestions.id,
      examId: examQuestions.examId,
      questionId: examQuestions.questionId,
      orderIndex: examQuestions.orderIndex,
      points: examQuestions.points,
      questionContent: questionBank.content,
      questionType: questionBank.type,
      questionOptions: questionBank.options,
      questionCorrectAnswer: questionBank.correctAnswer,
      questionExplanation: questionBank.explanation,
      questionCategory: questionBank.category,
      questionDifficulty: questionBank.difficulty,
    })
    .from(examQuestions)
    .innerJoin(questionBank, eq(examQuestions.questionId, questionBank.id))
    .where(eq(examQuestions.examId, examId))
    .orderBy(asc(examQuestions.orderIndex))
}

export async function insertExamQuestions(
  data: { examId: string; questionId: string; orderIndex: number; points: number }[]
) {
  return db.insert(examQuestions).values(data)
}

// ── Question Bank ───────────────────────────────────────────

export async function getAllQuestions() {
  return db.select().from(questionBank).orderBy(desc(questionBank.createdAt))
}

export async function insertQuestion(data: {
  content: string
  category: string
  difficulty: string
  type: string
  options?: unknown
  correctAnswer: string | null
  explanation: string | null
}) {
  const rows = await db
    .insert(questionBank)
    .values({
      content: data.content,
      category: data.category,
      difficulty: data.difficulty,
      type: data.type,
      options: data.options ?? null,
      correctAnswer: data.correctAnswer ?? "",
      explanation: data.explanation,
    })
    .returning()
  return rows[0]
}

export async function deleteQuestion(id: string) {
  await db.delete(questionBank).where(eq(questionBank.id, id))
}

// ── Exam Capture Requests ───────────────────────────────────

export async function getPendingCaptureRequests(targetUserId: string, examId: string) {
  return db
    .select({ id: examCaptureRequests.id })
    .from(examCaptureRequests)
    .where(
      and(
        eq(examCaptureRequests.targetUserId, targetUserId),
        eq(examCaptureRequests.examId, examId),
        eq(examCaptureRequests.status, "pending")
      )
    )
}

export async function updateCaptureRequestStatus(
  requestId: string,
  status: string,
  incidentId?: string
) {
  await db
    .update(examCaptureRequests)
    .set({
      status,
      capturedAt: new Date(),
      incidentId: incidentId ?? null,
    })
    .where(eq(examCaptureRequests.id, requestId))
}

export async function insertCaptureRequest(data: {
  targetUserId: string
  requestedBy: string
  examId: string
}) {
  return db.insert(examCaptureRequests).values({
    targetUserId: data.targetUserId,
    requestedBy: data.requestedBy,
    examId: data.examId,
    status: "pending",
  })
}
