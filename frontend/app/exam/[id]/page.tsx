"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/api"
import {
  Loader2, Clock, CheckCircle2, XCircle, AlertCircle,
  Camera, CameraOff, EyeOff, Mic, MicOff, ShieldAlert,
  ChevronRight, Circle
} from "lucide-react"
import dynamic from "next/dynamic"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => (
  <div className="h-64 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
  </div>
) })

interface Exam {
  id: string
  title: string
  description: string
  time_limit_minutes: number
  passing_score: number
  created_at: string
}

interface Question {
  id: string
  content: string
  type: "객관식" | "OX" | "단답형" | "서술형" | "코딩"
  options: string[] | null
  correct_answer: string | null
  explanation: string | null
  category: string
  difficulty: string
}

interface ExamQuestion {
  id: string
  exam_id: string
  question_id: string
  order_index: number
  points: number
  question: Question
}

type Phase = "loading" | "waiting" | "taking" | "submitted"
type CheckStatus = "idle" | "checking" | "ok" | "fail"

interface AttemptResult {
  score: number
  is_passed: boolean
  answers: Record<string, string>
  examQuestions: ExamQuestion[]
}

const SECURITY_ITEMS = [
  "평가 중 허용되지 않은 외부 프로그램, 웹사이트, 메신저 등을 사용하는 행위",
  "타인과 답안을 공유하거나, 타인의 도움을 받아 답안을 작성하는 행위",
  "시험 문제를 촬영, 캡처, 녹화하거나 외부로 유출하는 행위",
  "대리 평가 또는 본인이 아닌 다른 사람이 응시하는 행위",
  "객관식, 단답형, 서술형 문제에서 AI 도구(ChatGPT 등)를 사용하여 답안을 생성하는 행위",
  "화상 감독 기능을 고의로 비활성화하거나 방해하는 행위",
  "평가 전/중/후 평가 내용에 대해 타인과 소통하는 행위",
  "기타 공정한 평가 운영을 저해하는 일체의 부정 행위",
]

const PRECAUTIONS = [
  "평가 시작 후 추가시간은 제공되지 않으며, 시험은 시작 시간 기준 제한 시간 후 자동 종료됩니다.",
  "시험 중 웹캠은 반드시 켜진 상태를 유지해야 하며, 얼굴 전체가 화면에 보여야 합니다.",
  "시험 중 다른 탭이나 프로그램으로의 전환은 부정행위로 간주됩니다.",
  "시험 중 타인과의 대화, 메신저 사용, 외부 자료 참고는 부정행위로 간주됩니다.",
  "기술적 문제 발생 시 관리자에게 문의해 주시면 바로 대응해 드립니다.",
  "모든 답안 작성 후 최종 제출 버튼을 눌러 최종 제출해야 합니다.",
  "부정행위 적발 시 해당 시험은 무효 처리되며, 향후 응시가 제한될 수 있습니다.",
]

// ── 대기실 컴포넌트 ────────────────────────────────────────────
function WaitingRoom({
  exam,
  examQuestions,
  onStart,
}: {
  exam: Exam
  examQuestions: ExamQuestion[]
  onStart: (stream: MediaStream | null) => void
}) {
  const [camStatus, setCamStatus] = useState<CheckStatus>("idle")
  const [micStatus, setMicStatus] = useState<CheckStatus>("idle")
  const [camStream, setCamStream] = useState<MediaStream | null>(null)
  const [precautionAgreed, setPrecautionAgreed] = useState(false)
  const [securityChecked, setSecurityChecked] = useState<boolean[]>(new Array(SECURITY_ITEMS.length).fill(false))
  const previewRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (camStream && previewRef.current) {
      previewRef.current.srcObject = camStream
    }
  }, [camStream])

  async function checkCam() {
    setCamStatus("checking")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      setCamStream(stream)
      setCamStatus("ok")
    } catch {
      setCamStatus("fail")
    }
  }

  async function checkMic() {
    setMicStatus("checking")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      stream.getTracks().forEach(t => t.stop())
      setMicStatus("ok")
    } catch {
      setMicStatus("fail")
    }
  }

  function toggleSecurity(i: number) {
    setSecurityChecked(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  const allSecurityChecked = securityChecked.every(Boolean)
  const canStart = micStatus === "ok" && precautionAgreed && allSecurityChecked

  const StatusIcon = ({ status }: { status: CheckStatus }) => {
    if (status === "checking") return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    if (status === "fail") return <XCircle className="h-4 w-4 text-red-500" />
    return <Circle className="h-4 w-4 text-slate-300" />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">시험 대기실</p>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">{exam.title}</h1>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 시험 시간: {exam.time_limit_minutes}분</span>
            <span>{examQuestions.length}문제</span>
            <span>합격 기준: {exam.passing_score}점</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 환경 점검 */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">환경 점검</h2>
                <p className="text-xs text-slate-400 mt-0.5">시험 시작 전 아래 항목을 확인해 주세요</p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {/* 웹캠 */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={camStatus} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">웹캠 연결</span>
                    </div>
                    {camStatus !== "ok" && (
                      <button
                        onClick={checkCam}
                        disabled={camStatus === "checking"}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 transition-colors"
                      >
                        {camStatus === "checking" ? "확인 중…" : "확인하기"}
                      </button>
                    )}
                    {camStatus === "ok" && <span className="text-xs text-emerald-500 font-medium">확인됨</span>}
                  </div>
                  {camStatus === "ok" && camStream && (
                    <div className="mt-2 rounded-lg overflow-hidden bg-black w-full aspect-video max-h-36">
                      <video ref={previewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    </div>
                  )}
                  {camStatus === "fail" && (
                    <p className="text-xs text-red-500 mt-1">웹캠을 찾을 수 없습니다. 장치를 확인해 주세요.</p>
                  )}
                </div>

                {/* 마이크 */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={micStatus} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">마이크 연결</span>
                    </div>
                    {micStatus !== "ok" && (
                      <button
                        onClick={checkMic}
                        disabled={micStatus === "checking"}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 transition-colors"
                      >
                        {micStatus === "checking" ? "확인 중…" : "확인하기"}
                      </button>
                    )}
                    {micStatus === "ok" && <span className="text-xs text-emerald-500 font-medium">확인됨</span>}
                  </div>
                  {micStatus === "fail" && (
                    <p className="text-xs text-red-500 mt-1">마이크를 찾을 수 없습니다. 권한을 허용해 주세요.</p>
                  )}
                </div>
              </div>
            </div>

            {/* 유의사항 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">유의사항</h2>
              </div>
              <div className="px-5 py-4">
                <ol className="space-y-2">
                  {PRECAUTIONS.map((p, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="shrink-0 font-semibold text-slate-400">{i + 1}.</span>
                      {p}
                    </li>
                  ))}
                </ol>
                <label className="flex items-center gap-2.5 mt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={precautionAgreed}
                    onChange={e => setPrecautionAgreed(e.target.checked)}
                    className="h-4 w-4 rounded accent-blue-600"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    위 유의사항을 모두 읽었으며 동의합니다
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 오른쪽: 보안 서약 */}
          <div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-800/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-red-100 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <h2 className="text-sm font-bold text-red-800 dark:text-red-300">보안 서약</h2>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  다음 부정행위 예시를 확인하고, 각 항목에 동의해 주세요. 위반 시 평가가 무효 처리되며 자격 박탈될 수 있습니다.
                </p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {SECURITY_ITEMS.map((item, i) => (
                  <label key={i} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={securityChecked[i]}
                      onChange={() => toggleSecurity(i)}
                      className="h-4 w-4 mt-0.5 rounded accent-red-600 shrink-0"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                      {i + 1}. {item}
                    </span>
                  </label>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                <p className="text-xs text-slate-500">
                  <span className={`font-semibold ${allSecurityChecked ? "text-emerald-500" : "text-slate-400"}`}>
                    {securityChecked.filter(Boolean).length}/{SECURITY_ITEMS.length}개
                  </span>
                  {" "}항목 확인됨
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 시작 버튼 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          {!canStart && (
            <div className="flex items-start gap-2 mb-4 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                {micStatus !== "ok" && "마이크 확인이 필요합니다. "}
                {!precautionAgreed && "유의사항 동의가 필요합니다. "}
                {!allSecurityChecked && `보안 서약 ${SECURITY_ITEMS.length - securityChecked.filter(Boolean).length}개 항목이 남아있습니다.`}
              </span>
            </div>
          )}
          <button
            onClick={() => onStart(camStream)}
            disabled={!canStart}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            시험 시작하기
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 페이지 ─────────────────────────────────────────────
export default function ExamPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string

  const [phase, setPhase] = useState<Phase>("loading")
  const [exam, setExam] = useState<Exam | null>(null)
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [userId, setUserId] = useState<string>("")
  const [applicantName, setApplicantName] = useState<string>("")
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AttemptResult | null>(null)

  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [camStream, setCamStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const userIdRef = useRef<string>("")

  useEffect(() => { init() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function init() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) { router.push("/signin"); return }

    const user = sessionData.session.user
    setUserId(user.id)
    userIdRef.current = user.id
    setApplicantName(user.user_metadata?.full_name || user.email || user.id)

    const { data: examData, error: examError } = await supabase
      .from("exams").select("*").eq("id", examId).single()
    if (examError || !examData) { alert("시험 정보를 불러올 수 없습니다."); router.push("/"); return }
    setExam(examData)

    const { data: eqData, error: eqError } = await supabase
      .from("exam_questions").select("*, question:question_bank(*)")
      .eq("exam_id", examId).order("order_index")
    if (eqError || !eqData) { alert("문제를 불러올 수 없습니다."); return }

    setExamQuestions(eqData)
    setPhase("waiting")
  }

  function startExam(stream: MediaStream | null) {
    if (!exam) return
    setCamStream(stream)
    setStartedAt(new Date())
    setTimeLeft(exam.time_limit_minutes * 60)
    setPhase("taking")
  }

  useEffect(() => {
    if (camStream && videoRef.current) {
      videoRef.current.srcObject = camStream
    }
  }, [camStream])

  // 부정행위 방지
  useEffect(() => {
    if (phase !== "taking") return
    const blockContextMenu = (e: MouseEvent) => e.preventDefault()
    const blockSelect = (e: Event) => e.preventDefault()
    const blockKeys = (e: KeyboardEvent) => {
      if (e.key === "F12") { e.preventDefault(); return }
      if (e.ctrlKey || e.metaKey) {
        if (["c","a","v","x","u"].includes(e.key.toLowerCase())) e.preventDefault()
        if (e.shiftKey && ["i","j","c"].includes(e.key.toLowerCase())) e.preventDefault()
      }
    }
    const handleVisibility = () => {
      if (document.hidden) setTabSwitchCount(prev => prev + 1)
    }
    document.body.style.userSelect = "none"
    document.addEventListener("contextmenu", blockContextMenu)
    document.addEventListener("selectstart", blockSelect)
    document.addEventListener("keydown", blockKeys)
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      document.body.style.userSelect = ""
      document.removeEventListener("contextmenu", blockContextMenu)
      document.removeEventListener("selectstart", blockSelect)
      document.removeEventListener("keydown", blockKeys)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // 타이머
  useEffect(() => {
    if (phase !== "taking" || timeLeft <= 0) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); handleSubmit(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function stopWebcam() {
    if (camStream) { camStream.getTracks().forEach(t => t.stop()); setCamStream(null) }
  }

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submitting) return
    if (!autoSubmit && phase !== "taking") return
    if (timerRef.current) clearInterval(timerRef.current)
    stopWebcam()
    setSubmitting(true)
    if (tabSwitchCount > 0) {
      supabase.from("activity_logs").insert({
        user_id: userIdRef.current,
        event_type: "exam_submit",
        metadata: { exam_id: examId, tab_switch_count: tabSwitchCount },
      }).then(() => {})
    }
    try {
      const { score, is_passed } = await api.exams.submitDirect({
        exam_id: examId, answers,
        started_at: startedAt?.toISOString() ?? new Date().toISOString(),
        applicant_name: applicantName,
      })
      setResult({ score, is_passed, answers, examQuestions })
    } catch (err) {
      console.error("제출 오류:", err)
      setSubmitting(false)
      return
    }
    setPhase("submitted")
    setSubmitting(false)
  }, [submitting, phase, examQuestions, answers, exam, examId, userId, applicantName, startedAt, tabSwitchCount]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { return () => { stopWebcam() } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0")
    const s = (seconds % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  // ── 로딩 ──────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // ── 대기실 ─────────────────────────────────────────────────
  if (phase === "waiting" && exam) {
    return <WaitingRoom exam={exam} examQuestions={examQuestions} onStart={startExam} />
  }

  // ── 시험 응시 ───────────────────────────────────────────────
  if (phase === "taking" && exam) {
    const timerWarning = timeLeft < 300
    const total = examQuestions.length
    const eq = examQuestions[currentIndex]
    const isFirst = currentIndex === 0
    const isLast = currentIndex === total - 1
    const answeredCount = examQuestions.filter(q => !!answers[q.question.id]).length

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
        {/* 상단 헤더 */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{exam.title}</h1>
              <span className="shrink-0 text-xs text-slate-400">{currentIndex + 1} / {total}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {tabSwitchCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium">
                  <EyeOff className="w-3 h-3" /> 탭전환 {tabSwitchCount}회
                </div>
              )}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-sm font-semibold ${
                timerWarning ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}>
                <Clock className="w-3.5 h-3.5" />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* 문제 번호 점 진행바 */}
          <div className="max-w-3xl mx-auto px-4 pb-3 flex gap-1.5 flex-wrap">
            {examQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
                  i === currentIndex
                    ? "bg-blue-600 text-white"
                    : answers[q.question.id]
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* 웹캠 플로팅 */}
        <div className="fixed bottom-6 right-6 z-20">
          {camStream ? (
            <div className="relative w-32 h-24 rounded-xl overflow-hidden border-2 border-slate-700 shadow-lg bg-black">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-1 left-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="w-32 h-24 rounded-xl bg-slate-800 border border-slate-600 flex flex-col items-center justify-center gap-1">
              <CameraOff className="w-5 h-5 text-slate-400" />
              <span className="text-xs text-slate-400">카메라 없음</span>
            </div>
          )}
        </div>

        {/* 문제 카드 */}
        <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
          {eq && (
            <QuestionCard key={eq.question.id} index={currentIndex} eq={eq}
              answer={answers[eq.question.id] ?? ""} onAnswer={val => setAnswer(eq.question.id, val)} />
          )}
        </div>

        {/* 하단 네비게이션 */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={isFirst}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
            >
              이전
            </button>

            <span className="text-xs text-slate-400">{answeredCount}/{total} 완료</span>

            {isLast ? (
              <button
                onClick={() => { if (window.confirm(`답변한 문제: ${answeredCount}/${total}\n시험을 제출하시겠습니까? 제출 후 수정이 불가합니다.`)) handleSubmit(false) }}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 text-white font-semibold text-sm transition-colors flex items-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />제출 중...</> : "시험 제출"}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(i => Math.min(total - 1, i + 1))}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
              >
                다음
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── 결과 ───────────────────────────────────────────────────
  if (phase === "submitted" && result && exam) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center mb-6 shadow-sm">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${result.is_passed ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
              {result.is_passed ? <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" /> : <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />}
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">{result.score}점</h1>
            <p className={`text-lg font-semibold mb-2 ${result.is_passed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {result.is_passed ? "합격" : "불합격"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">합격 기준: {exam.passing_score}점 이상</p>
            {tabSwitchCount > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium">
                <EyeOff className="w-3.5 h-3.5" /> 탭 전환 {tabSwitchCount}회 감지됨
              </div>
            )}
            {result.examQuestions.some(eq => eq.question.type === "서술형" || eq.question.type === "코딩") && (
              <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2">
                서술형·코딩 문제는 수동 채점이 진행됩니다. 최종 결과는 변경될 수 있습니다.
              </div>
            )}
          </div>

          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">답안 확인</h2>
          <div className="space-y-3">
            {result.examQuestions.map((eq, index) => {
              const userAnswer = result.answers[eq.question.id] ?? ""
              const correct = eq.question.correct_answer ?? ""
              const qType = eq.question.type
              let isCorrect: boolean | null = null
              if (qType === "객관식" || qType === "OX") isCorrect = userAnswer === correct
              else if (qType === "단답형") isCorrect = userAnswer.trim().toLowerCase() === correct.trim().toLowerCase()

              return (
                <div key={eq.question.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-4 ${
                  isCorrect === true ? "border-green-300 dark:border-green-700"
                  : isCorrect === false ? "border-red-300 dark:border-red-700"
                  : "border-slate-200 dark:border-slate-700"}`}>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 dark:text-slate-100 mb-2 leading-relaxed">{eq.question.content}</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex gap-2">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">내 답안:</span>
                          {userAnswer ? (
                            qType === "코딩"
                              ? <pre className="flex-1 text-xs font-mono bg-slate-900 text-slate-100 rounded p-2 overflow-x-auto whitespace-pre-wrap">{userAnswer.replace(/^\/\/ __lang__:.+\n/, "")}</pre>
                              : <span className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{userAnswer}</span>
                          ) : <span className="italic text-slate-400">(미응답)</span>}
                        </div>
                        {isCorrect !== null && <div className="flex gap-2"><span className="text-slate-500 dark:text-slate-400 shrink-0">정답:</span><span className="text-green-700 dark:text-green-400 font-medium">{correct}</span></div>}
                        {isCorrect === true && <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> 정답</span>}
                        {isCorrect === false && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium"><XCircle className="w-3.5 h-3.5" /> 오답</span>}
                        {isCorrect === null && <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">수동 채점 예정</span>}
                        {eq.question.explanation && <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400"><span className="font-medium">해설: </span>{eq.question.explanation}</div>}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{eq.points}점</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return null
}

function QuestionCard({ index, eq, answer, onAnswer }: {
  index: number; eq: ExamQuestion; answer: string; onAnswer: (val: string) => void
}) {
  const q = eq.question
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{index + 1}</span>
        <div className="flex-1">
          <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">{q.content}</p>
          <div className="flex gap-1.5 mt-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{q.type}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{eq.points}점</span>
          </div>
        </div>
      </div>

      {q.type === "객관식" && q.options && (
        <div className="space-y-2 ml-10">
          {q.options.map((opt, i) => (
            <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${answer === opt ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500"}`}>
              <input type="radio" name={`q_${q.id}`} value={opt} checked={answer === opt} onChange={() => onAnswer(opt)} className="accent-blue-600" />
              <span className="text-sm text-slate-800 dark:text-slate-200">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {q.type === "OX" && (
        <div className="flex gap-3 ml-10">
          {["O", "X"].map(val => (
            <button key={val} onClick={() => onAnswer(val)} className={`flex-1 py-4 rounded-xl text-3xl font-bold transition-colors border-2 ${
              answer === val ? val === "O" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
              : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-500"}`}>
              {val}
            </button>
          ))}
        </div>
      )}

      {q.type === "단답형" && (
        <div className="ml-10">
          <input type="text" value={answer} onChange={e => onAnswer(e.target.value)} placeholder="답을 입력하세요"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}

      {q.type === "서술형" && (
        <div className="ml-10">
          <textarea value={answer} onChange={e => onAnswer(e.target.value)} rows={8} placeholder="답안을 작성하세요"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
        </div>
      )}

      {q.type === "코딩" && (
        <div className="ml-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">언어</span>
            <select defaultValue="python"
              onChange={e => { const lang = e.target.value; const code = answer.replace(/^\/\/ __lang__:.+\n/, ""); onAnswer(`// __lang__:${lang}\n${code}`) }}
              className="text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
            </select>
          </div>
          <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
            <MonacoEditor height="320px"
              language={(() => { const match = answer.match(/^\/\/ __lang__:(.+)\n/); return match ? match[1] : "python" })()}
              value={answer.replace(/^\/\/ __lang__:.+\n/, "")}
              onChange={val => { const match = answer.match(/^\/\/ __lang__:(.+)\n/); const lang = match ? match[1] : "python"; onAnswer(`// __lang__:${lang}\n${val ?? ""}`) }}
              theme="vs-dark"
              options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 4, wordWrap: "on", lineNumbers: "on", padding: { top: 12, bottom: 12 } }} />
          </div>
          <p className="text-xs text-slate-400">Tab 키로 들여쓰기 · 수동 채점 문항</p>
        </div>
      )}
    </div>
  )
}
