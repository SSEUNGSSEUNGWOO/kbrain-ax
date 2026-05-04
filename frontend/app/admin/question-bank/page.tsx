"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, BookMarked, Trash2, ChevronDown, Loader2 } from "lucide-react"

interface Question {
  id: string
  content: string
  category: string
  difficulty: string
  type: string
  options: string[] | null
  correct_answer: string | null
  explanation: string | null
  created_at: string
}

const DIFFICULTY_STYLE: Record<string, string> = {
  하: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  중: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  상: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const TYPE_STYLE: Record<string, string> = {
  객관식: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  OX: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  단답형: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  서술형: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  코딩: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedQ, setExpandedQ] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [filterCategory, setFilterCategory] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterDifficulty, setFilterDifficulty] = useState("")
  const [form, setForm] = useState({
    content: "", category: "", difficulty: "중", type: "객관식",
    options: ["", "", "", ""], correct_answer: "", explanation: "",
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from("question_bank").select("*").order("created_at", { ascending: false })
    setQuestions((data ?? []) as Question[])
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.content.trim()) return
    setAdding(true)
    const payload: Record<string, unknown> = {
      content: form.content.trim(),
      category: form.category.trim() || "일반",
      difficulty: form.difficulty,
      type: form.type,
      explanation: form.explanation.trim() || null,
      correct_answer: form.correct_answer.trim() || null,
    }
    if (form.type === "객관식") {
      payload.options = form.options.filter(o => o.trim())
    }
    const { data } = await supabase.from("question_bank").insert(payload).select().single()
    if (data) {
      setQuestions(prev => [data as Question, ...prev])
      setForm({ content: "", category: "", difficulty: "중", type: "객관식", options: ["", "", "", ""], correct_answer: "", explanation: "" })
      setShowForm(false)
    }
    setAdding(false)
  }

  async function handleDelete(id: string) {
    await supabase.from("question_bank").delete().eq("id", id)
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const categories = Array.from(new Set(questions.map(q => q.category).filter(Boolean)))
  const types = Array.from(new Set(questions.map(q => q.type).filter(Boolean)))
  const filtered = questions.filter(q =>
    (!filterCategory || q.category === filterCategory) &&
    (!filterType || q.type === filterType) &&
    (!filterDifficulty || q.difficulty === filterDifficulty)
  )

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">문제 은행</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">총 {questions.length}개 문제</p>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          문제 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-blue-200 dark:border-blue-800/50 p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">새 문제 추가</p>
          <textarea
            value={form.content}
            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            placeholder="문제 내용"
            rows={3}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-3">
            <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="카테고리"
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value, correct_answer: "" }))}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="객관식">객관식</option>
              <option value="OX">OX</option>
              <option value="단답형">단답형</option>
              <option value="서술형">서술형</option>
              <option value="코딩">코딩</option>
            </select>
            <select value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="하">하</option>
              <option value="중">중</option>
              <option value="상">상</option>
            </select>
          </div>
          {form.type === "객관식" && (
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <input value={opt} onChange={e => setForm(p => { const o = [...p.options]; o[i] = e.target.value; return { ...p, options: o } })}
                    placeholder={`보기 ${i + 1}`}
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <input value={form.correct_answer} onChange={e => setForm(p => ({ ...p, correct_answer: e.target.value }))}
                placeholder="정답 번호 (예: 2)"
                className="w-32 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          {form.type === "OX" && (
            <div className="flex gap-2">
              {["O", "X"].map(v => {
                const selected = form.correct_answer === v
                const selClass = v === "O"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400"
                  : "bg-red-50 border-red-300 text-red-500 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400"
                return (
                  <button key={v} type="button"
                    onClick={() => setForm(p => ({ ...p, correct_answer: v }))}
                    className={`h-12 w-12 rounded-xl text-2xl font-black border transition-colors ${selected ? selClass : "bg-slate-50 border-slate-200 text-slate-300 dark:bg-slate-900/50 dark:border-slate-700 hover:border-slate-300"}`}>
                    {v}
                  </button>
                )
              })}
            </div>
          )}
          {form.type === "단답형" && (
            <input value={form.correct_answer} onChange={e => setForm(p => ({ ...p, correct_answer: e.target.value }))}
              placeholder="정답"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          )}
          {(form.type === "서술형" || form.type === "코딩") && (
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input type="checkbox"
                  checked={form.correct_answer === "수동채점"}
                  onChange={e => setForm(p => ({ ...p, correct_answer: e.target.checked ? "수동채점" : "" }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                수동 채점 문항으로 등록
              </label>
              {form.correct_answer !== "수동채점" && (
                <textarea value={form.correct_answer}
                  onChange={e => setForm(p => ({ ...p, correct_answer: e.target.value }))}
                  placeholder="모범 답안 (선택)"
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono" />
              )}
            </div>
          )}
          <input value={form.explanation} onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))}
            placeholder={form.type === "서술형" || form.type === "코딩" ? "채점 기준 (선택)" : "해설 (선택)"}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">취소</button>
            <button onClick={handleAdd} disabled={adding || !form.content.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}저장
            </button>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="flex flex-wrap gap-2">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">전체 카테고리</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">전체 유형</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">전체 난이도</option>
          <option value="하">하</option>
          <option value="중">중</option>
          <option value="상">상</option>
        </select>
        {(filterCategory || filterType || filterDifficulty) && (
          <>
            <button onClick={() => { setFilterCategory(""); setFilterType(""); setFilterDifficulty("") }}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">초기화</button>
            <span className="self-center text-xs text-slate-400">{filtered.length}개</span>
          </>
        )}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center">
          <BookMarked className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400">문제가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q, idx) => {
            const isOpen = expandedQ === q.id
            return (
              <div key={q.id} className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                <div className="px-5 py-4">
                  {/* 메타 + 번호 */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-slate-400 tabular-nums">Q{idx + 1}</span>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${TYPE_STYLE[q.type] ?? "bg-slate-100 text-slate-500"}`}>
                      {q.type}
                    </span>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${DIFFICULTY_STYLE[q.difficulty] ?? "bg-slate-100 text-slate-500"}`}>
                      난이도 {q.difficulty}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {q.category}
                    </span>
                    <button onClick={() => handleDelete(q.id)} className="ml-auto text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-400 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* 문제 본문 */}
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">{q.content}</p>

                  {/* 열기 버튼 */}
                  {(q.options?.length || q.correct_answer || q.explanation) ? (
                    <button
                      onClick={() => setExpandedQ(isOpen ? null : q.id)}
                      className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      {isOpen ? "접기" : (q.type === "객관식" ? "보기 · 해설 보기" : q.type === "OX" ? "정답 보기" : q.type === "단답형" ? "정답 보기" : "채점 기준 보기")}
                    </button>
                  ) : null}
                </div>

                {/* 확장 영역 — 타입별 */}
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-700/40 px-5 py-4 bg-slate-50/60 dark:bg-slate-900/30 space-y-3">

                    {/* 객관식 */}
                    {q.type === "객관식" && q.options?.map((opt, i) => {
                      const isCorrect = String(i + 1) === q.correct_answer
                      return (
                        <div key={i} className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${isCorrect ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50" : "bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/30"}`}>
                          <span className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${isCorrect ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>{i + 1}</span>
                          <span className={`text-sm leading-relaxed ${isCorrect ? "text-emerald-700 dark:text-emerald-300 font-medium" : "text-slate-600 dark:text-slate-400"}`}>{opt}</span>
                        </div>
                      )
                    })}

                    {/* OX */}
                    {q.type === "OX" && q.correct_answer && (
                      <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl text-2xl font-black ${q.correct_answer === "O" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400"}`}>
                        {q.correct_answer}
                      </div>
                    )}

                    {/* 단답형 */}
                    {q.type === "단답형" && q.correct_answer && (
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-4 py-3">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">정답</p>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{q.correct_answer}</p>
                      </div>
                    )}

                    {/* 서술형 / 코딩 — 채점 기준 */}
                    {(q.type === "서술형" || q.type === "코딩") && q.correct_answer && q.correct_answer !== "수동채점" && (
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-4 py-3">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">정답 / 모범 답안</p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap leading-relaxed">{q.correct_answer}</p>
                      </div>
                    )}
                    {(q.type === "서술형" || q.type === "코딩") && q.correct_answer === "수동채점" && (
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 dark:bg-slate-700 px-3 py-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">수동 채점 문항</span>
                      </div>
                    )}

                    {/* 해설 / 채점 기준 (공통) */}
                    {q.explanation && (
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 px-4 py-3">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
                          {q.type === "서술형" || q.type === "코딩" ? "채점 기준" : "해설"}
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
