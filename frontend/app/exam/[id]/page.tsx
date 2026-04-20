"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
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

type Phase = "loading" | "ready" | "taking" | "submitted"

interface AttemptResult {
  score: number
  is_passed: boolean
  answers: Record<string, string>
  examQuestions: ExamQuestion[]
}

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

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function init() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      router.push("/signin")
      return
    }

    const user = sessionData.session.user
    setUserId(user.id)
    setApplicantName(
      user.user_metadata?.full_name || user.email || user.id
    )

    const { data: examData, error: examError } = await supabase
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single()

    if (examError || !examData) {
      alert("시험 정보를 불러올 수 없습니다.")
      router.push("/")
      return
    }

    setExam(examData)

    const { data: eqData, error: eqError } = await supabase
      .from("exam_questions")
      .select("*, question:question_bank(*)")
      .eq("exam_id", examId)
      .order("order_index")

    if (eqError || !eqData) {
      alert("문제를 불러올 수 없습니다.")
      return
    }

    setExamQuestions(eqData)
    setPhase("ready")
  }

  function startExam() {
    if (!exam) return
    const now = new Date()
    setStartedAt(now)
    setTimeLeft(exam.time_limit_minutes * 60)
    setPhase("taking")
  }

  useEffect(() => {
    if (phase !== "taking" || timeLeft <= 0) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          handleSubmit(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(
    async (autoSubmit = false) => {
      if (submitting) return
      if (!autoSubmit && phase !== "taking") return

      if (timerRef.current) clearInterval(timerRef.current)
      setSubmitting(true)

      const submittedAt = new Date()

      let scoredPoints = 0
      let totalPoints = 0

      for (const eq of examQuestions) {
        totalPoints += eq.points
        const userAnswer = answers[eq.question.id] ?? ""
        const correct = eq.question.correct_answer ?? ""
        const qType = eq.question.type

        if (qType === "객관식" || qType === "OX") {
          if (userAnswer === correct) scoredPoints += eq.points
        } else if (qType === "단답형") {
          if (
            userAnswer.trim().toLowerCase() === correct.trim().toLowerCase()
          )
            scoredPoints += eq.points
        }
        // 서술형/코딩: 수동채점, 0점
      }

      const score =
        totalPoints > 0 ? Math.round((scoredPoints / totalPoints) * 100) : 0
      const is_passed = exam ? score >= exam.passing_score : false

      try {
        await supabase.from("exam_attempts").insert({
          exam_id: examId,
          user_id: userId,
          applicant_name: applicantName,
          started_at: startedAt?.toISOString(),
          submitted_at: submittedAt.toISOString(),
          answers,
          score,
          is_passed,
        })
      } catch (err) {
        console.error("제출 오류:", err)
      }

      setResult({ score, is_passed, answers, examQuestions })
      setPhase("submitted")
      setSubmitting(false)
    },
    [
      submitting,
      phase,
      examQuestions,
      answers,
      exam,
      examId,
      userId,
      applicantName,
      startedAt,
    ]
  )

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")
    const s = (seconds % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (phase === "ready" && exam) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 max-w-lg w-full text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-5">
            <Clock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {exam.title}
          </h1>
          {exam.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              {exam.description}
            </p>
          )}
          <div className="grid grid-cols-3 gap-3 mb-8 text-sm">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {exam.time_limit_minutes}분
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">제한 시간</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {examQuestions.length}문제
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">총 문제 수</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {exam.passing_score}점
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">합격 기준</div>
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6 text-left">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                시험을 시작하면 타이머가 작동하며, 시간이 종료되면 자동으로 제출됩니다.
                서술형·코딩 문제는 수동으로 채점됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={startExam}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
          >
            시험 시작
          </button>
        </div>
      </div>
    )
  }

  if (phase === "taking" && exam) {
    const timerWarning = timeLeft < 300
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Sticky header with timer */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {exam.title}
            </h1>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-sm font-semibold ${
                timerWarning
                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {examQuestions.map((eq, index) => (
            <QuestionCard
              key={eq.question.id}
              index={index}
              eq={eq}
              answer={answers[eq.question.id] ?? ""}
              onAnswer={(val) => setAnswer(eq.question.id, val)}
            />
          ))}

          <div className="pt-4 pb-8">
            <button
              onClick={() => {
                if (window.confirm("시험을 제출하시겠습니까? 제출 후 수정이 불가합니다.")) {
                  handleSubmit(false)
                }
              }}
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  제출 중...
                </>
              ) : (
                "시험 제출"
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === "submitted" && result && exam) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Result card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center mb-6 shadow-sm">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                result.is_passed
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
              }`}
            >
              {result.is_passed ? (
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {result.score}점
            </h1>
            <p
              className={`text-lg font-semibold mb-2 ${
                result.is_passed
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {result.is_passed ? "합격" : "불합격"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              합격 기준: {exam.passing_score}점 이상
            </p>
            {result.examQuestions.some(
              (eq) => eq.question.type === "서술형" || eq.question.type === "코딩"
            ) && (
              <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2">
                서술형·코딩 문제는 수동 채점이 진행됩니다. 최종 결과는 변경될 수 있습니다.
              </div>
            )}
          </div>

          {/* Answer review */}
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
            답안 확인
          </h2>
          <div className="space-y-3">
            {result.examQuestions.map((eq, index) => {
              const userAnswer = result.answers[eq.question.id] ?? ""
              const correct = eq.question.correct_answer ?? ""
              const qType = eq.question.type
              let isCorrect: boolean | null = null

              if (qType === "객관식" || qType === "OX") {
                isCorrect = userAnswer === correct
              } else if (qType === "단답형") {
                isCorrect =
                  userAnswer.trim().toLowerCase() === correct.trim().toLowerCase()
              }

              return (
                <div
                  key={eq.question.id}
                  className={`bg-white dark:bg-slate-800 rounded-xl border p-4 ${
                    isCorrect === true
                      ? "border-green-300 dark:border-green-700"
                      : isCorrect === false
                      ? "border-red-300 dark:border-red-700"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 dark:text-slate-100 mb-2 leading-relaxed">
                        {eq.question.content}
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex gap-2">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">내 답안:</span>
                          {userAnswer ? (
                            qType === "코딩" ? (
                              <pre className="flex-1 text-xs font-mono bg-slate-900 text-slate-100 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                                {userAnswer.replace(/^\/\/ __lang__:.+\n/, "")}
                              </pre>
                            ) : (
                              <span className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{userAnswer}</span>
                            )
                          ) : (
                            <span className="italic text-slate-400">(미응답)</span>
                          )}
                        </div>
                        {isCorrect !== null && (
                          <div className="flex gap-2">
                            <span className="text-slate-500 dark:text-slate-400 shrink-0">정답:</span>
                            <span className="text-green-700 dark:text-green-400 font-medium">
                              {correct}
                            </span>
                          </div>
                        )}
                        {isCorrect === true && (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 정답
                          </span>
                        )}
                        {isCorrect === false && (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" /> 오답
                          </span>
                        )}
                        {isCorrect === null && (
                          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            수동 채점 예정
                          </span>
                        )}
                        {eq.question.explanation && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            <span className="font-medium">해설: </span>
                            {eq.question.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                      {eq.points}점
                    </div>
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

function QuestionCard({
  index,
  eq,
  answer,
  onAnswer,
}: {
  index: number
  eq: ExamQuestion
  answer: string
  onAnswer: (val: string) => void
}) {
  const q = eq.question

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1">
          <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
            {q.content}
          </p>
          <div className="flex gap-1.5 mt-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {q.type}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {eq.points}점
            </span>
          </div>
        </div>
      </div>

      {q.type === "객관식" && q.options && (
        <div className="space-y-2 ml-10">
          {q.options.map((opt, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                answer === opt
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
              }`}
            >
              <input
                type="radio"
                name={`q_${q.id}`}
                value={opt}
                checked={answer === opt}
                onChange={() => onAnswer(opt)}
                className="accent-blue-600"
              />
              <span className="text-sm text-slate-800 dark:text-slate-200">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {q.type === "OX" && (
        <div className="flex gap-3 ml-10">
          {["O", "X"].map((val) => (
            <button
              key={val}
              onClick={() => onAnswer(val)}
              className={`flex-1 py-4 rounded-xl text-3xl font-bold transition-colors border-2 ${
                answer === val
                  ? val === "O"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-500"
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      )}

      {q.type === "단답형" && (
        <div className="ml-10">
          <input
            type="text"
            value={answer}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="답을 입력하세요"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {q.type === "서술형" && (
        <div className="ml-10">
          <textarea
            value={answer}
            onChange={(e) => onAnswer(e.target.value)}
            rows={8}
            placeholder="답안을 작성하세요"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>
      )}

      {q.type === "코딩" && (
        <div className="ml-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">언어</span>
            <select
              defaultValue="python"
              onChange={(e) => {
                // 언어 선택 저장 (답안과 별도로 prefix로 저장)
                const lang = e.target.value
                const code = answer.replace(/^\/\/ __lang__:.+\n/, "")
                onAnswer(`// __lang__:${lang}\n${code}`)
              }}
              className="text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
            </select>
          </div>
          <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
            <MonacoEditor
              height="320px"
              language={(() => {
                const match = answer.match(/^\/\/ __lang__:(.+)\n/)
                return match ? match[1] : "python"
              })()}
              value={answer.replace(/^\/\/ __lang__:.+\n/, "")}
              onChange={(val) => {
                const match = answer.match(/^\/\/ __lang__:(.+)\n/)
                const lang = match ? match[1] : "python"
                onAnswer(`// __lang__:${lang}\n${val ?? ""}`)
              }}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                tabSize: 4,
                wordWrap: "on",
                lineNumbers: "on",
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>
          <p className="text-xs text-slate-400">Tab 키로 들여쓰기 · 수동 채점 문항</p>
        </div>
      )}
    </div>
  )
}
