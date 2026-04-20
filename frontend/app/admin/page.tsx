"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Users, FileText, CheckCircle2, Clock, ChevronRight } from "lucide-react"
import Link from "next/link"

interface Selection {
  id: string
  title: string
  status: string
  apply_end: string
}

interface Stats {
  selections: number
  applications: number
  passed: number
  under_review: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ selections: 0, applications: 0, passed: 0, under_review: 0 })
  const [recentSelections, setRecentSelections] = useState<Selection[]>([])

  useEffect(() => {
    async function load() {
      const [selRes, appRes] = await Promise.all([
        supabase.from("selections").select("id, title, status, apply_end").order("created_at", { ascending: false }).limit(3),
        supabase.from("applications").select("status"),
      ])

      const apps = appRes.data ?? []
      setStats({
        selections: selRes.data?.length ?? 0,
        applications: apps.length,
        passed: apps.filter(a => a.status === "pass").length,
        under_review: apps.filter(a => a.status === "under_review").length,
      })
      setRecentSelections((selRes.data ?? []) as Selection[])
    }
    load()
  }, [])

  const statCards = [
    { label: "선발 전형",  value: stats.selections,   icon: FileText,     },
    { label: "총 지원자",  value: stats.applications, icon: Users,        },
    { label: "합격",       value: stats.passed,        icon: CheckCircle2, },
    { label: "검토 중",    value: stats.under_review,  icon: Clock,        },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">대시보드</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">전체 현황을 확인하세요.</p>
      </div>

      {/* 스탯 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
              <s.icon className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 최근 전형 */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">최근 선발 전형</p>
          <Link href="/admin/selections" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            전체 보기
          </Link>
        </div>
        {recentSelections.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">등록된 전형이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
            {recentSelections.map(sel => (
              <li key={sel.id}>
                <Link
                  href={`/admin/selections/${sel.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{sel.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      마감 {new Date(sel.apply_end).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
