"use client"

import { useEffect, useState } from "react"
import { getLatestApplicationByUserId, getSelectionById } from "@/lib/db/actions"
import { FileText, Loader2, PenLine, Clock, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"

interface Application {
  id: string
  status: string
  createdAt: Date | null
  selectionId: string | null
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  submitted:    { label: "제출 완료", color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",         icon: Clock },
  under_review: { label: "검토 중",   color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",     icon: Clock },
  pass:         { label: "서면 합격", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20", icon: CheckCircle2 },
  fail:         { label: "불합격",    color: "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20",             icon: XCircle },
}

// TODO: Replace with real user ID from auth when implemented
const STUB_USER_ID = "00000000-0000-0000-0000-000000000000"

export default function ApplicationPage() {
  const [application, setApplication] = useState<Application | null>(null)
  const [selectionTitle, setSelectionTitle] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const app = await getLatestApplicationByUserId(STUB_USER_ID)
      setApplication(app as Application | null)

      if (app?.selectionId) {
        const sel = await getSelectionById(app.selectionId)
        if (sel) setSelectionTitle(sel.title)
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

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">지원서</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">제출한 지원서를 확인하세요.</p>
      </div>

      {!application ? (
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
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">내 지원서</span>
              <span className="ml-auto font-mono text-xs text-slate-400">#{application.id.slice(0, 8)}</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">전형</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectionTitle || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">제출일</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {application.createdAt ? new Date(application.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">상태</span>
                {(() => {
                  const s = STATUS_MAP[application.status]
                  if (!s) return <span className="text-xs text-slate-400">{application.status}</span>
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.color}`}>
                      <s.icon className="h-3 w-3" />
                      {s.label}
                    </span>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
