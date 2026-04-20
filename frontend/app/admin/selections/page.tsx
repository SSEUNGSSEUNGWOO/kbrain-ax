"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, ChevronRight, FileText, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"

interface Selection {
  id: string
  title: string
  description: string
  status: string
  apply_start: string
  apply_end: string
  has_written_eval: boolean
  has_exam: boolean
  exam_first: boolean
  created_at: string
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft:     { label: "초안",    color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
  open:      { label: "접수중",  color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
  closed:    { label: "마감",    color: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
  completed: { label: "완료",    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, color: "bg-slate-100 text-slate-500" }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

export default function SelectionsPage() {
  const [selections, setSelections] = useState<Selection[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("selections")
        .select("*")
        .order("created_at", { ascending: false })
      setSelections((data ?? []) as Selection[])
      setLoading(false)
    }
    load()
  }, [])

  async function handleCreate() {
    setCreating(true)
    const { data, error } = await supabase
      .from("selections")
      .insert({
        title: "새 선발 전형",
        description: "",
        status: "draft",
        apply_start: new Date().toISOString(),
        apply_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        has_written_eval: true,
        has_exam: false,
        exam_first: false,
      })
      .select()
      .single()
    setCreating(false)
    if (data) {
      setSelections(prev => [data as Selection, ...prev])
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">선발 전형</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">전형을 관리하고 지원자를 심사하세요.</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          새 전형 만들기
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : selections.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center">
          <FileText className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">등록된 선발 전형이 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">위 버튼을 눌러 첫 전형을 만들어보세요.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
            {selections.map(sel => (
              <li key={sel.id}>
                <Link
                  href={`/admin/selections/${sel.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{sel.title}</p>
                      <StatusBadge status={sel.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(sel.apply_start).toLocaleDateString("ko-KR")} –{" "}
                        {new Date(sel.apply_end).toLocaleDateString("ko-KR")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {sel.has_written_eval && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">서면심사</span>
                        )}
                        {sel.has_exam && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">온라인시험</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
