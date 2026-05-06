"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { api } from "@/lib/api"
import {
  getSelectionById,
  getApplicationsBySelectionId,
  getExamsBySelectionId,
  updateApplicationStatus,
} from "@/lib/db/actions"
import {
  Loader2, ArrowLeft, FileText, BookOpen,
  Sparkles, CheckCircle2, XCircle, Clock, Users, Eye
} from "lucide-react"
import Link from "next/link"

interface Selection {
  id: string
  title: string
  description: string | null
  status: string
  applyStart: Date | null
  applyEnd: Date | null
  hasWrittenEval: boolean
  hasExam: boolean
  examFirst: boolean
}

interface Application {
  id: string
  status: string
  createdAt: Date | null
  userId: string
  applicantName: string | null
  email: string | null
}

interface Exam {
  id: string
  title: string
  timeLimitMinutes: number
  status: string
  createdAt: Date | null
}

const APP_STATUS = {
  submitted:    { label: "제출됨",   dot: "bg-blue-400",    text: "text-blue-600 dark:text-blue-400" },
  under_review: { label: "검토 중",  dot: "bg-amber-400",   text: "text-amber-600 dark:text-amber-400" },
  pass:         { label: "합격",     dot: "bg-emerald-400", text: "text-emerald-600 dark:text-emerald-400" },
  fail:         { label: "불합격",   dot: "bg-red-400",     text: "text-red-500 dark:text-red-400" },
}

function StatusPill({ status }: { status: string }) {
  const cfg = APP_STATUS[status as keyof typeof APP_STATUS] ?? { label: status, dot: "bg-slate-400", text: "text-slate-500" }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

type TabKey = "applications" | "exams"

export default function SelectionDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [examList, setExamList] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>("applications")
  const [evaluating, setEvaluating] = useState<Record<string, boolean>>({})
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function init() {
      const [selData, appData, examData] = await Promise.all([
        getSelectionById(id),
        getApplicationsBySelectionId(id),
        getExamsBySelectionId(id),
      ])

      if (selData) setSelection(selData as unknown as Selection)
      if (appData) setApplications(appData as unknown as Application[])
      if (examData) setExamList(examData as unknown as Exam[])

      setLoading(false)
    }
    init()
  }, [id])

  async function handleEvaluate(appId: string) {
    setEvaluating(p => ({ ...p, [appId]: true }))
    try {
      await api.evaluations.evaluate({ application_id: appId })
      alert("AI 평가가 완료되었습니다.")
    } catch (e) {
      alert(`평가 실패: ${(e as Error).message}`)
    } finally {
      setEvaluating(p => ({ ...p, [appId]: false }))
    }
  }

  async function handleStatusChange(appId: string, newStatus: string) {
    setUpdatingStatus(p => ({ ...p, [appId]: true }))
    await updateApplicationStatus(appId, newStatus)
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a))
    setUpdatingStatus(p => ({ ...p, [appId]: false }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!selection) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500">전형을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const passCount = applications.filter(a => a.status === "pass").length
  const tabs = [
    { key: "applications" as TabKey, label: "지원서", icon: FileText, count: applications.length },
    ...(selection.hasExam ? [{ key: "exams" as TabKey, label: "시험", icon: BookOpen, count: examList.length }] : []),
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            전형 목록
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{selection.title}</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "총 지원자", value: applications.length, icon: Users },
            { label: "합격",      value: passCount,            icon: CheckCircle2 },
            { label: "검토 중",   value: applications.filter(a => a.status === "under_review").length, icon: Clock },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <s.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <span className={`text-xs rounded-full px-1.5 py-0.5 tabular-nums ${
                activeTab === tab.key
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {activeTab === "applications" && (
          <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
            {applications.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-400">제출된 지원서가 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      {["지원자", "제출일", "상태", "합불 처리", "AI 평가"].map((h, i) => (
                        <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${i >= 3 ? "text-center" : "text-left"}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                    {applications.map(app => (
                      <tr key={app.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {app.applicantName ?? app.email ?? "-"}
                          </p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{app.userId.slice(0, 8)}...</p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-400">
                          {app.createdAt ? new Date(app.createdAt).toLocaleDateString("ko-KR") : "-"}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusPill status={app.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStatusChange(app.id, "pass")}
                              disabled={updatingStatus[app.id] || app.status === "pass"}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <CheckCircle2 className="h-3 w-3" />합격
                            </button>
                            <button
                              onClick={() => handleStatusChange(app.id, "fail")}
                              disabled={updatingStatus[app.id] || app.status === "fail"}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <XCircle className="h-3 w-3" />불합격
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleEvaluate(app.id)}
                            disabled={evaluating[app.id]}
                            className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {evaluating[app.id]
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Sparkles className="h-3 w-3" />}
                            {evaluating[app.id] ? "평가 중..." : "AI 평가"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "exams" && (
          <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">시험 목록</p>
              <button
                onClick={() => router.push(`/admin/selections/${id}/exams/new`)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                + 시험 출제
              </button>
            </div>
            {examList.length === 0 ? (
              <div className="py-16 text-center">
                <BookOpen className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-400">등록된 시험이 없습니다.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {examList.map(exam => (
                  <li key={exam.id} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{exam.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">제한 시간 {exam.timeLimitMinutes}분</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/admin/exams/${exam.id}/monitor`}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200"
                      >
                        <Eye className="h-3 w-3" /> 감독
                      </Link>
                      <StatusPill status={exam.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
