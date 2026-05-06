"use client"

import { useEffect, useState } from "react"
import {
  getLatestApplicationByUserId,
  getSelectionById,
  getExamAttemptsByUserIdWithExamTitle,
} from "@/lib/db/actions"
import {
  CheckCircle2, Clock, XCircle, Loader2, PenLine,
  BookOpen, ChevronRight, AlertCircle, Trophy, CalendarDays
} from "lucide-react"
import Link from "next/link"

interface Selection {
  id: string
  title: string
  hasWrittenEval: boolean
  hasExam: boolean
  examFirst: boolean
}

interface Application {
  id: string
  status: string
  createdAt: Date | null
  selectionId: string | null
}

interface Attempt {
  id: string
  examId: string
  score: number | null
  isPassed: boolean | null
  submittedAt: Date | null
  examTitle: string | null
}

// TODO: Replace with real user ID from auth when implemented
const STUB_USER_ID = "00000000-0000-0000-0000-000000000000"

function buildSteps(sel: Selection | null) {
  const steps = [{ key: "submitted", label: "지원서 제출" }]
  if (!sel) { steps.push({ key: "final", label: "최종 결과" }); return steps }
  if (sel.examFirst) {
    if (sel.hasExam) steps.push({ key: "exam", label: "온라인 시험" })
    if (sel.hasWrittenEval) steps.push({ key: "under_review", label: "서면 심사" }, { key: "pass", label: "심사 통과" })
  } else {
    if (sel.hasWrittenEval) steps.push({ key: "under_review", label: "서면 심사" }, { key: "pass", label: "심사 통과" })
    if (sel.hasExam) steps.push({ key: "exam", label: "온라인 시험" })
  }
  steps.push({ key: "final", label: "최종 결과" })
  return steps
}

function NextAction({ status, hasExam }: { status: string; hasExam: boolean }) {
  if (status === "submitted") {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4 flex items-start gap-3">
        <Clock className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">지원서 검토 중</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">지원서가 성공적으로 제출되었습니다. 서면 심사 결과를 기다려 주세요.</p>
        </div>
      </div>
    )
  }
  if (status === "under_review") {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">서면 심사 진행 중</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">심사위원 검토가 진행 중입니다. 결과가 나오면 이메일로 안내드립니다.</p>
        </div>
      </div>
    )
  }
  if (status === "pass" && hasExam) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4">
        <div className="flex items-start gap-3 mb-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">서면 심사 합격 - 온라인 시험 응시 가능</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">아래 버튼을 눌러 지금 바로 시험에 응시하세요.</p>
          </div>
        </div>
        <Link
          href="/dashboard/exams"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          시험 응시하러 가기
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }
  if (status === "pass") {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">서면 심사 합격</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">축하합니다! 다음 전형 안내를 기다려 주세요.</p>
        </div>
      </div>
    )
  }
  if (status === "fail") {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 flex items-start gap-3">
        <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">아쉽게도 탈락하셨습니다</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">다음 기회에 다시 도전해 주세요.</p>
        </div>
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const [application, setApplication] = useState<Application | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const app = await getLatestApplicationByUserId(STUB_USER_ID)
      setApplication(app as Application | null)

      const [selData, attData] = await Promise.all([
        app?.selectionId
          ? getSelectionById(app.selectionId)
          : Promise.resolve(null),
        getExamAttemptsByUserIdWithExamTitle(STUB_USER_ID, 3),
      ])

      if (selData) setSelection(selData as unknown as Selection)
      if (attData) setAttempts(attData as Attempt[])

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

  if (!application) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white mb-1">대시보드</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">선발 전형 진행 현황입니다.</p>
        <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
          <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
            <PenLine className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">아직 지원서를 제출하지 않았습니다</p>
          <p className="text-xs text-slate-400 mt-1 mb-5">지원서를 작성하고 제출하면 심사가 시작됩니다.</p>
          <Link href="/apply" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            <PenLine className="h-4 w-4" />
            지원서 작성하기
          </Link>
        </div>
      </div>
    )
  }

  const steps = buildSteps(selection)
  const currentIdx = application.status === "fail" ? -1 : steps.findIndex(s => s.key === application.status)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">대시보드</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{selection?.title ?? "선발 전형"} 진행 현황입니다.</p>
      </div>

      <NextAction status={application.status} hasExam={selection?.hasExam ?? false} />

      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 p-5">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-5">전형 단계</p>
        <div className="flex items-center w-full">
          {steps.map((step, i) => {
            const isFail = application.status === "fail"
            const done = !isFail && i < currentIdx
            const active = !isFail && i === currentIdx
            return (
              <div key={step.key} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isFail && i <= 1 ? "bg-red-100 dark:bg-red-900/30 text-red-500"
                    : done ? "bg-blue-600 text-white"
                    : active ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/40"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}>
                    {isFail && i <= 1 ? <XCircle className="h-3.5 w-3.5" />
                      : done ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : <span>{i + 1}</span>}
                  </div>
                  <span className={`text-[10px] font-medium text-center whitespace-nowrap ${
                    active ? "text-blue-600 dark:text-blue-400"
                    : done ? "text-slate-600 dark:text-slate-400"
                    : "text-slate-400 dark:text-slate-600"
                  }`}>{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full ${done ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {attempts.length > 0 && (
        <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">시험 결과</span>
            </div>
            <Link href="/dashboard/exams" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">전체 보기</Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
            {attempts.map((att) => (
              <div key={att.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  att.isPassed ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"
                }`}>
                  {att.isPassed
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    : <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {att.examTitle ?? "시험"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : "-"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{att.score ?? 0}<span className="text-xs font-normal text-slate-400 ml-0.5">점</span></p>
                  <p className={`text-xs font-semibold ${att.isPassed ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {att.isPassed ? "합격" : "불합격"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4">
          <p className="text-xs text-slate-400 mb-1">지원서 제출일</p>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {application.createdAt ? new Date(application.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : "-"}
          </p>
        </div>
        <Link href="/dashboard/application" className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group flex flex-col justify-between">
          <p className="text-xs text-slate-400 mb-1">지원서</p>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800 dark:text-slate-200">내용 확인</p>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  )
}
