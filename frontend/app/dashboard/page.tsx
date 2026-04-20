"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { CheckCircle2, Clock, XCircle, Loader2, PenLine } from "lucide-react"
import Link from "next/link"

interface Selection {
  id: string
  title: string
  has_written_eval: boolean
  has_exam: boolean
  exam_first: boolean
}

interface Application {
  id: string
  status: string
  created_at: string
  selection_id?: string
}

function buildSteps(sel: Selection | null) {
  const steps = [{ key: "submitted", label: "지원서 제출" }]
  if (!sel) { steps.push({ key: "final", label: "최종 결과" }); return steps }
  if (sel.exam_first) {
    if (sel.has_exam) steps.push({ key: "exam", label: "온라인 시험" })
    if (sel.has_written_eval) steps.push({ key: "under_review", label: "서면 심사" }, { key: "pass", label: "심사 통과" })
  } else {
    if (sel.has_written_eval) steps.push({ key: "under_review", label: "서면 심사" }, { key: "pass", label: "심사 통과" })
    if (sel.has_exam) steps.push({ key: "exam", label: "온라인 시험" })
  }
  steps.push({ key: "final", label: "최종 결과" })
  return steps
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  submitted:    { label: "제출 완료", color: "text-blue-600 dark:text-blue-400",       icon: Clock },
  under_review: { label: "검토 중",   color: "text-amber-600 dark:text-amber-400",     icon: Clock },
  pass:         { label: "서면 합격", color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
  fail:         { label: "불합격",    color: "text-red-500 dark:text-red-400",         icon: XCircle },
}

export default function DashboardPage() {
  const [application, setApplication] = useState<Application | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: apps } = await supabase
        .from("applications").select("*").eq("user_id", session.user.id)
        .order("created_at", { ascending: false }).limit(1)

      const app = apps?.[0] ?? null
      setApplication(app)

      if (app?.selection_id) {
        const { data } = await supabase
          .from("selections").select("id, title, has_written_eval, has_exam, exam_first")
          .eq("id", app.selection_id).single()
        if (data) setSelection(data as Selection)
      }

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
  const statusInfo = STATUS_INFO[application.status]

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">대시보드</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{selection?.title ?? "선발 전형"} 진행 현황입니다.</p>
      </div>

      {/* 진행 단계 */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">선발 진행 현황</p>
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

        {statusInfo && (
          <div className={`mt-5 flex items-center gap-2 text-sm font-medium ${statusInfo.color}`}>
            <statusInfo.icon className="h-4 w-4" />
            현재 상태: {statusInfo.label}
            {application.status === "under_review" && (
              <span className="text-xs font-normal text-slate-400 ml-1">— 결과 발표까지 기다려 주세요</span>
            )}
          </div>
        )}

        {application.status === "fail" && (
          <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 p-3">
            <p className="text-xs text-red-600 dark:text-red-400">아쉽게 탈락하였습니다. 다음 기회에 다시 도전해 주세요.</p>
          </div>
        )}
      </div>

      {/* 바로가기 */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/application" className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
          <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
            <PenLine className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">지원서</p>
          <p className="text-xs text-slate-400 mt-0.5">제출한 지원서 확인</p>
        </Link>
        <Link href="/dashboard/exams" className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
          <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">시험</p>
          <p className="text-xs text-slate-400 mt-0.5">응시 가능한 시험 확인</p>
        </Link>
      </div>
    </div>
  )
}
