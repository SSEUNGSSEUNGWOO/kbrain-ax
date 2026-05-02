"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2, Eye, AlertTriangle, EyeOff, UserX, Users, Copy, Scissors, ClipboardPaste, Camera, Wrench, MousePointerClick, X } from "lucide-react"

type LogRow = {
  id: string
  user_id: string
  event_type: string
  metadata: Record<string, unknown> | null
  video_url: string | null
  created_at: string
  applicant_name?: string
}

type Aggregate = {
  user_id: string
  applicant_name: string
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

export default function ExamMonitorPage() {
  const params = useParams()
  const examId = params.id as string
  const [loading, setLoading] = useState(true)
  const [examTitle, setExamTitle] = useState("")
  const [logs, setLogs] = useState<LogRow[]>([])
  const [profileMap, setProfileMap] = useState<Record<string, string>>({})
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; log: LogRow } | null>(null)
  const inflightRef = useRef<Set<string>>(new Set())

  async function resolveName(userId: string) {
    if (profileMap[userId] || inflightRef.current.has(userId)) return
    inflightRef.current.add(userId)
    const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle()
    inflightRef.current.delete(userId)
    if (data?.full_name) {
      setProfileMap(prev => ({ ...prev, [userId]: data.full_name }))
    }
  }

  const enrichedLogs = useMemo<LogRow[]>(
    () => logs.map(l => ({ ...l, applicant_name: profileMap[l.user_id] ?? l.user_id.slice(0, 8) + "…" })),
    [logs, profileMap]
  )

  const aggregates = useMemo<Aggregate[]>(() => {
    const map = new Map<string, Aggregate>()
    for (const r of enrichedLogs) {
      const existing = map.get(r.user_id) ?? {
        user_id: r.user_id,
        applicant_name: r.applicant_name!,
        counts: {},
        latestAt: r.created_at,
      }
      existing.counts[r.event_type] = (existing.counts[r.event_type] ?? 0) + 1
      if (r.created_at > existing.latestAt) existing.latestAt = r.created_at
      existing.applicant_name = r.applicant_name!
      map.set(r.user_id, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.latestAt.localeCompare(a.latestAt))
  }, [enrichedLogs])

  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: exam } = await supabase.from("exams").select("title").eq("id", examId).single()
      if (cancelled) return
      setExamTitle(exam?.title ?? "")

      const { data: rows } = await supabase
        .from("activity_logs")
        .select("id,user_id,event_type,metadata,video_url,created_at")
        .contains("metadata", { exam_id: examId })
        .order("created_at", { ascending: false })
        .limit(200)
      if (cancelled || !rows) { setLoading(false); return }
      setLogs(rows as LogRow[])
      const uniqUsers = Array.from(new Set(rows.map(r => r.user_id)))
      uniqUsers.forEach(resolveName)
      setLoading(false)
    }
    init()

    const channel = supabase.channel(`monitor-${examId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          const row = payload.new as LogRow
          if ((row.metadata as { exam_id?: string })?.exam_id !== examId) return
          setLogs(prev => [row, ...prev].slice(0, 200))
          resolveName(row.user_id)
        })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [examId])

  async function openVideo(log: LogRow) {
    if (!log.video_url) {
      alert("이 이벤트엔 영상이 첨부되지 않았습니다.")
      return
    }
    const { data, error } = await supabase.storage.from("exam-incidents").createSignedUrl(log.video_url, 600)
    if (error || !data) { alert("영상 URL 생성 실패: " + (error?.message ?? "unknown")); return }
    setSelectedVideo({ url: data.signedUrl, log })
  }

  async function requestCapture(targetUserId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert("로그인이 필요합니다.")
    const { error } = await supabase.from("exam_capture_requests").insert({
      target_user_id: targetUserId,
      requested_by: user.id,
      exam_id: examId,
      status: "pending",
    })
    if (error) return alert("캡쳐 요청 실패: " + error.message)
    alert("캡쳐 요청 보냄. 응시자 클라이언트가 5초 안에 영상을 업로드합니다.")
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
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">실시간 부정행위 트리거 + 영상 검토</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 응시자별 누적 카드 */}
        <section className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">응시자 ({aggregates.length}명)</h2>
          {aggregates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
              아직 트리거된 응시자가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {aggregates.map(a => (
                <div key={a.user_id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{a.applicant_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">{a.user_id.slice(0, 8)}…</div>
                    </div>
                    <button
                      onClick={() => requestCapture(a.user_id)}
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

        {/* 실시간 알림 피드 */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">실시간 알림 ({enrichedLogs.length})</h2>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {enrichedLogs.map(log => {
              const meta = EVENT_LABEL[log.event_type] ?? { label: log.event_type, color: "bg-slate-100 text-slate-700", Icon: AlertTriangle }
              return (
                <div key={log.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 justify-between">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${meta.color}`}>
                      <meta.Icon className="w-3 h-3" />
                      {meta.label}
                    </span>
                    <span className="text-slate-400 font-mono">{log.created_at.slice(11, 19)}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 truncate">{log.applicant_name}</div>
                  {log.video_url && (
                    <button
                      onClick={() => openVideo(log)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      <Eye className="w-3 h-3" /> 영상 보기
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* 영상 모달 */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <div className="text-sm">
                <div className="font-semibold text-slate-800 dark:text-slate-100">{selectedVideo.log.applicant_name}</div>
                <div className="text-xs text-slate-500">{(EVENT_LABEL[selectedVideo.log.event_type]?.label) ?? selectedVideo.log.event_type} · {selectedVideo.log.created_at.slice(11, 19)}</div>
              </div>
              <button onClick={() => setSelectedVideo(null)} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <video src={selectedVideo.url} controls autoPlay className="w-full bg-black" />
          </div>
        </div>
      )}
    </div>
  )
}
