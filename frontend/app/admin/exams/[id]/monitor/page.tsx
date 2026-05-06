"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import {
  getExamById,
  getActivityLogsByExamId,
  getProfilesByIds,
  insertCaptureRequest,
} from "@/lib/db/actions"
import { Loader2, Eye, AlertTriangle, EyeOff, UserX, Users, Copy, Scissors, ClipboardPaste, Camera, Wrench, MousePointerClick, X } from "lucide-react"

type LogRow = {
  id: string
  userId: string
  eventType: string
  metadata: Record<string, unknown> | null
  videoUrl: string | null
  createdAt: Date
  applicantName?: string
}

type Aggregate = {
  userId: string
  applicantName: string
  counts: Record<string, number>
  latestAt: string
}

const EVENT_LABEL: Record<string, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  tab_switch:        { label: "탭 전환",       color: "bg-amber-100 text-amber-700",   Icon: EyeOff },
  capture_attempt:   { label: "캡쳐 시도",      color: "bg-red-100 text-red-700",       Icon: Camera },
  copy_attempt:      { label: "복사 시도",      color: "bg-rose-100 text-rose-700",     Icon: Copy },
  paste_attempt:     { label: "붙여넣기",       color: "bg-pink-100 text-pink-700",     Icon: ClipboardPaste },
  devtool_attempt:   { label: "개발자도구",      color: "bg-purple-100 text-purple-700", Icon: Wrench },
  context_menu:      { label: "우클릭",         color: "bg-slate-100 text-slate-700",   Icon: MousePointerClick },
  shortcut_attempt:  { label: "단축키",         color: "bg-slate-100 text-slate-700",   Icon: Scissors },
  absent_face:       { label: "자리 비움",      color: "bg-orange-100 text-orange-700", Icon: UserX },
  multiple_faces:    { label: "다중 인물",      color: "bg-fuchsia-100 text-fuchsia-700", Icon: Users },
  admin_capture:     { label: "감독자 캡쳐",    color: "bg-blue-100 text-blue-700",     Icon: Eye },
}

// Stub admin user ID for capture requests
const STUB_ADMIN_ID = "00000000-0000-0000-0000-000000000001"

export default function ExamMonitorPage() {
  const params = useParams()
  const examId = params.id as string
  const [loading, setLoading] = useState(true)
  const [examTitle, setExamTitle] = useState("")
  const [logs, setLogs] = useState<LogRow[]>([])
  const [profileMap, setProfileMap] = useState<Record<string, string>>({})
  const resolvedRef = useRef<Set<string>>(new Set())

  async function resolveNames(userIds: string[]) {
    const toResolve = userIds.filter(id => !profileMap[id] && !resolvedRef.current.has(id))
    if (toResolve.length === 0) return
    toResolve.forEach(id => resolvedRef.current.add(id))
    const data = await getProfilesByIds(toResolve)
    if (data) {
      setProfileMap(prev => ({
        ...prev,
        ...Object.fromEntries(data.map(p => [p.id, p.fullName ?? ""]))
      }))
    }
  }

  const enrichedLogs = useMemo<LogRow[]>(
    () => logs.map(l => ({ ...l, applicantName: profileMap[l.userId] ?? l.userId.slice(0, 8) + "..." })),
    [logs, profileMap]
  )

  const aggregates = useMemo<Aggregate[]>(() => {
    const map = new Map<string, Aggregate>()
    for (const r of enrichedLogs) {
      const createdAtStr = new Date(r.createdAt).toISOString()
      const existing = map.get(r.userId) ?? {
        userId: r.userId,
        applicantName: r.applicantName!,
        counts: {},
        latestAt: createdAtStr,
      }
      existing.counts[r.eventType] = (existing.counts[r.eventType] ?? 0) + 1
      if (createdAtStr > existing.latestAt) existing.latestAt = createdAtStr
      existing.applicantName = r.applicantName!
      map.set(r.userId, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.latestAt.localeCompare(a.latestAt))
  }, [enrichedLogs])

  useEffect(() => {
    let cancelled = false
    async function init() {
      const exam = await getExamById(examId)
      if (cancelled) return
      setExamTitle(exam?.title ?? "")

      const rows = await getActivityLogsByExamId(examId, 200)
      if (cancelled || !rows) { setLoading(false); return }
      setLogs(rows as LogRow[])
      const uniqUsers = Array.from(new Set(rows.map(r => r.userId)))
      resolveNames(uniqUsers)
      setLoading(false)
    }
    init()

    // Poll for new logs every 5 seconds (replaces Supabase realtime)
    const interval = setInterval(async () => {
      if (cancelled) return
      const rows = await getActivityLogsByExamId(examId, 200)
      if (!cancelled && rows) {
        setLogs(rows as LogRow[])
        const uniqUsers = Array.from(new Set(rows.map(r => r.userId)))
        resolveNames(uniqUsers)
      }
    }, 5000)

    return () => { cancelled = true; clearInterval(interval) }
  }, [examId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function requestCapture(targetUserId: string) {
    try {
      await insertCaptureRequest({
        targetUserId,
        requestedBy: STUB_ADMIN_ID,
        examId,
      })
      alert("캡쳐 요청 보냄. 응시자 클라이언트가 5초 안에 영상을 업로드합니다.")
    } catch (err) {
      alert("캡쳐 요청 실패: " + (err as Error).message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">시험 감독: {examTitle}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">부정행위 트리거 + 영상 검토 (5초 간격 폴링)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">응시자 ({aggregates.length}명)</h2>
          {aggregates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
              아직 트리거된 응시자가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {aggregates.map(a => (
                <div key={a.userId} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{a.applicantName}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">{a.userId.slice(0, 8)}...</div>
                    </div>
                    <button
                      onClick={() => requestCapture(a.userId)}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                      title="응시자에게 즉시 영상 캡쳐 요청"
                    >
                      <Camera className="w-3 h-3" /> 캡쳐
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(a.counts).map(([type, count]) => {
                      const meta = EVENT_LABEL[type] ?? { label: type, color: "bg-slate-100 text-slate-700", Icon: AlertTriangle }
                      return (
                        <span key={type} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${meta.color}`}>
                          <meta.Icon className="w-3 h-3" />
                          {meta.label} {count}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">알림 피드 ({enrichedLogs.length})</h2>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {enrichedLogs.map(log => {
              const meta = EVENT_LABEL[log.eventType] ?? { label: log.eventType, color: "bg-slate-100 text-slate-700", Icon: AlertTriangle }
              return (
                <div key={log.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 justify-between">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${meta.color}`}>
                      <meta.Icon className="w-3 h-3" />
                      {meta.label}
                    </span>
                    <span className="text-slate-400 font-mono">{new Date(log.createdAt).toISOString().slice(11, 19)}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 truncate">{log.applicantName}</div>
                  {log.videoUrl && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                      <Eye className="w-3 h-3" /> 영상 첨부됨 (스토리지 미연결)
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
