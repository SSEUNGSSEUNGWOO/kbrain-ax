"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Users, FileText, CheckCircle2, Clock, ChevronRight,
  TrendingUp, TrendingDown, BookOpen, Award
} from "lucide-react"
import Link from "next/link"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts"

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

interface AttemptRow {
  score: number
}

interface ActivityRow {
  id: string
  user_id: string
  event_type: string
  created_at: string
  metadata?: Record<string, unknown>
  profiles?: { full_name?: string; email?: string } | null
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ selections: 0, applications: 0, passed: 0, under_review: 0 })
  const [recentSelections, setRecentSelections] = useState<Selection[]>([])
  const [applicationTrend, setApplicationTrend] = useState<{ day: string; count: number }[]>([])
  const [scoreDistribution, setScoreDistribution] = useState<{ range: string; count: number }[]>([])
  const [statusPie, setStatusPie] = useState<{ name: string; value: number; color: string }[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityRow[]>([])
  const [profileMap, setProfileMap] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const [selRes, appRes, attemptRes, activityRes] = await Promise.all([
        supabase.from("selections").select("id, title, status, apply_end").order("created_at", { ascending: false }).limit(3),
        supabase.from("applications").select("status, created_at"),
        supabase.from("exam_attempts").select("score"),
        supabase.from("activity_logs").select("id, user_id, event_type, created_at, metadata").order("created_at", { ascending: false }).limit(5),
      ])

      const apps = appRes.data ?? []
      const attempts = (attemptRes.data ?? []) as AttemptRow[]

      // 스탯
      setStats({
        selections: selRes.data?.length ?? 0,
        applications: apps.length,
        passed: apps.filter(a => a.status === "pass").length,
        under_review: apps.filter(a => a.status === "under_review").length,
      })

      setRecentSelections((selRes.data ?? []) as Selection[])

      // 지원자 누적 추이 (7일 단위 버킷)
      if (apps.length > 0) {
        const sorted = [...apps].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        const buckets: Record<string, number> = {}
        sorted.forEach(a => {
          const d = new Date(a.created_at)
          const key = `${d.getMonth() + 1}/${Math.ceil(d.getDate() / 7) * 7}`
          buckets[key] = (buckets[key] ?? 0) + 1
        })
        let cum = 0
        const trend = Object.entries(buckets).map(([day, cnt]) => { cum += cnt; return { day, count: cum } })
        setApplicationTrend(trend)
      }

      // 시험 점수 분포
      if (attempts.length > 0) {
        const ranges = [
          { range: "0–39",  min: 0,  max: 39  },
          { range: "40–59", min: 40, max: 59  },
          { range: "60–79", min: 60, max: 79  },
          { range: "80–89", min: 80, max: 89  },
          { range: "90–100",min: 90, max: 100 },
        ]
        setScoreDistribution(ranges.map(r => ({
          range: r.range,
          count: attempts.filter(a => a.score >= r.min && a.score <= r.max).length,
        })))
      }

      // 상태 파이
      const statusMap = [
        { key: "submitted",    name: "제출 완료", color: "#3b82f6" },
        { key: "under_review", name: "검토 중",   color: "#f59e0b" },
        { key: "pass",         name: "서면 합격", color: "#10b981" },
        { key: "fail",         name: "불합격",    color: "#ef4444" },
      ]
      setStatusPie(
        statusMap
          .map(s => ({ ...s, value: apps.filter(a => a.status === s.key).length }))
          .filter(s => s.value > 0)
      )

      const activities = (activityRes.data ?? []) as ActivityRow[]
      setRecentActivity(activities)

      const uniqUserIds = Array.from(new Set(activities.map(a => a.user_id)))
      if (uniqUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles").select("id,full_name").in("id", uniqUserIds)
        if (profiles) {
          setProfileMap(Object.fromEntries(profiles.map(p => [p.id, p.full_name ?? ""])))
        }
      }
    }
    load()
  }, [])

  const statCards = [
    { label: "총 지원자", value: stats.applications, icon: Users,        color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-900/20",       trend: null },
    { label: "서면 합격", value: stats.passed,        icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", trend: null },
    { label: "검토 중",   value: stats.under_review,  icon: Clock,        color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-900/20",     trend: null },
    { label: "시험 응시", value: stats.selections,    icon: BookOpen,     color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-900/20",   trend: null },
  ]

  const eventLabel: Record<string, string> = {
    exam_submit:      "시험 제출",
    exam_start:       "시험 시작",
    exam_view:        "시험 조회",
    tab_switch:       "탭 전환",
    capture_attempt:  "캡쳐 시도",
    copy_attempt:     "복사 시도",
    paste_attempt:    "붙여넣기 시도",
    devtool_attempt:  "개발자도구 시도",
    context_menu:     "우클릭",
    shortcut_attempt: "단축키",
    absent_face:      "자리 비움",
    multiple_faces:   "다중 인물",
    admin_capture:    "감독자 캡쳐",
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">대시보드</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">전체 선발 현황</p>
        </div>
      </div>

      {/* 스탯 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 차트 */}
      {(applicationTrend.length > 0 || statusPie.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {applicationTrend.length > 0 && (
            <div className="lg:col-span-2 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 p-5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">지원자 누적 추이</p>
              <p className="text-xs text-slate-400 mb-4">전체 {stats.applications}명</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={applicationTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#areaGrad)" name="지원자" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {statusPie.length > 0 && (
            <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 p-5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">지원자 상태 분포</p>
              <p className="text-xs text-slate-400 mb-4">전체 {stats.applications}명</p>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={36} outerRadius={58} dataKey="value" paddingAngle={3}>
                    {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {statusPie.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-slate-600 dark:text-slate-400">{s.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{s.value}명</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 점수 분포 + 최근 활동 */}
      {(scoreDistribution.some(s => s.count > 0) || recentActivity.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {scoreDistribution.some(s => s.count > 0) && (
            <div className="lg:col-span-2 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 p-5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">시험 점수 분포</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={scoreDistribution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" name="인원" radius={[4, 4, 0, 0]}>
                    {scoreDistribution.map((_, i) => (
                      <Cell key={i} fill={i >= 3 ? "#10b981" : i >= 1 ? "#3b82f6" : "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {recentActivity.length > 0 && (
            <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">최근 활동</p>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {recentActivity.map(a => {
                  const name = profileMap[a.user_id] || a.user_id.slice(0, 8) + "…"
                  const initial = (profileMap[a.user_id] ?? a.user_id).slice(0, 1).toUpperCase()
                  return (
                    <li key={a.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center shrink-0 text-xs font-bold text-white">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                          {eventLabel[a.event_type] ?? a.event_type}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{name}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(a.created_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 선발 전형 */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">선발 전형</p>
          </div>
          <Link href="/admin/selections" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            전체 보기 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {recentSelections.length === 0 ? (
          <div className="py-10 text-center">
            <FileText className="h-8 w-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-400">등록된 전형이 없습니다.</p>
          </div>
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
                    <p className="text-xs text-slate-400 mt-0.5">마감 {new Date(sel.apply_end).toLocaleDateString("ko-KR")}</p>
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
