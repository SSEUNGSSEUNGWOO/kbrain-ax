"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { BookOpen, Loader2, Clock, ChevronRight, AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"

interface Exam {
  id: string
  title: string
  time_limit_minutes: number
  passing_score: number
}

interface Attempt {
  id: string
  exam_id: string
  score: number
  is_passed: boolean
  submitted_at: string
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [canTake, setCanTake] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState("")

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      setCanTake(true)

      // 시험 목록 + 내 응시 이력 병렬 조회
      const [examRes, attemptRes] = await Promise.all([
        supabase.from("exams").select("id, title, time_limit_minutes, passing_score")
          .eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("exam_attempts").select("id, exam_id, score, is_passed, submitted_at")
          .eq("user_id", session.user.id).order("submitted_at", { ascending: false }),
      ])

      if (examRes.data) setExams(examRes.data as Exam[])
      if (attemptRes.data) setAttempts(attemptRes.data as Attempt[])

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  const attemptsByExam = attempts.reduce<Record<string, Attempt[]>>((acc, a) => {
    if (!acc[a.exam_id]) acc[a.exam_id] = []
    acc[a.exam_id].push(a)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">시험</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">응시 가능한 시험 목록입니다.</p>
      </div>

      {/* 응시 불가 안내 */}
      {!canTake && reason && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">{reason}</p>
        </div>
      )}

      {/* 시험 목록 */}
      {exams.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center">
          <BookOpen className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400">현재 출제된 시험이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => {
            const myAttempts = attemptsByExam[exam.id] ?? []
            const latest = myAttempts[0]
            return (
              <div key={exam.id} className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{exam.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" /> {exam.time_limit_minutes}분
                      </span>
                      <span className="text-xs text-slate-400">합격 기준 {exam.passing_score}점</span>
                    </div>
                  </div>
                  {canTake && (
                    <Link
                      href={`/exam/${exam.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                      응시하기 <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>

                {/* 응시 이력 */}
                {myAttempts.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-700/40 px-5 py-3 bg-slate-50/60 dark:bg-slate-900/20">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">응시 이력</p>
                    <div className="space-y-1.5">
                      {myAttempts.map((att, i) => (
                        <div key={att.id} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-16 flex-shrink-0">
                            {new Date(att.submitted_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                          </span>
                          <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-200">{att.score}점</span>
                          {att.is_passed
                            ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" />합격</span>
                            : <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 dark:text-red-400"><XCircle className="h-3 w-3" />불합격</span>
                          }
                          {i === 0 && <span className="text-[10px] text-slate-400 ml-auto">최근</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
