"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getAllQuestions, createExam, insertExamQuestions } from "@/lib/db/actions"
import {
  ArrowLeft, Search, Plus, X, Loader2, CheckSquare, Square
} from "lucide-react"
import Link from "next/link"

interface Question {
  id: string
  content: string
  category: string
  difficulty: string
  type: string
  options: unknown
  correctAnswer: string
  explanation: string | null
}

interface SelectedQuestion {
  question: Question
  points: number
  order_index: number
}

const DIFFICULTY_COLOR: Record<string, string> = {
  "하": "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
  "중": "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
  "상": "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
}

const TYPE_COLOR: Record<string, string> = {
  "객관식": "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
  "OX": "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
  "단답형": "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
  "서술형": "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20",
  "코딩": "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700",
}

export default function NewExamPage() {
  const router = useRouter()
  const params = useParams()
  const selectionId = params.id as string

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30)
  const [passingScore, setPassingScore] = useState(60)

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [filterCategory, setFilterCategory] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterDifficulty, setFilterDifficulty] = useState("")
  const [searchText, setSearchText] = useState("")

  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([])
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    fetchQuestions()
  }, [])

  async function fetchQuestions() {
    setLoading(true)
    const data = await getAllQuestions()
    if (data) {
      setQuestions(data as Question[])
      const cats = Array.from(new Set(data.map((q) => q.category).filter(Boolean)))
      setCategories(cats)
    }
    setLoading(false)
  }

  const filteredQuestions = questions.filter((q) => {
    if (filterCategory && q.category !== filterCategory) return false
    if (filterType && q.type !== filterType) return false
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false
    if (searchText && !q.content.toLowerCase().includes(searchText.toLowerCase())) return false
    return true
  })

  function isSelected(questionId: string) {
    return selectedQuestions.some((sq) => sq.question.id === questionId)
  }

  function toggleQuestion(question: Question) {
    if (isSelected(question.id)) {
      setSelectedQuestions((prev) => {
        const filtered = prev.filter((sq) => sq.question.id !== question.id)
        return filtered.map((sq, i) => ({ ...sq, order_index: i }))
      })
    } else {
      setSelectedQuestions((prev) => [
        ...prev,
        { question, points: 5, order_index: prev.length },
      ])
    }
  }

  function updatePoints(questionId: string, points: number) {
    setSelectedQuestions((prev) =>
      prev.map((sq) =>
        sq.question.id === questionId ? { ...sq, points } : sq
      )
    )
  }

  function removeSelected(questionId: string) {
    setSelectedQuestions((prev) => {
      const filtered = prev.filter((sq) => sq.question.id !== questionId)
      return filtered.map((sq, i) => ({ ...sq, order_index: i }))
    })
  }

  function moveQuestion(index: number, direction: "up" | "down") {
    const newSelected = [...selectedQuestions]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newSelected.length) return
    const temp = newSelected[index]
    newSelected[index] = newSelected[targetIndex]
    newSelected[targetIndex] = temp
    setSelectedQuestions(newSelected.map((sq, i) => ({ ...sq, order_index: i })))
  }

  async function handleSave() {
    if (!title.trim()) {
      alert("시험 제목을 입력해주세요.")
      return
    }
    if (selectedQuestions.length === 0) {
      alert("최소 1개 이상의 문제를 선택해주세요.")
      return
    }

    setSaving(true)
    try {
      const examData = await createExam({
        title: title.trim(),
        description: description.trim(),
        timeLimitMinutes,
        passingScore,
        selectionId,
        isActive: true,
      })

      if (!examData) throw new Error("시험 생성 실패")

      const eqData = selectedQuestions.map((sq) => ({
        examId: examData.id,
        questionId: sq.question.id,
        orderIndex: sq.order_index,
        points: sq.points,
      }))

      await insertExamQuestions(eqData)

      router.push(`/admin/selections/${selectionId}`)
    } catch (err: unknown) {
      alert(`저장 중 오류가 발생했습니다: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const totalPoints = selectedQuestions.reduce((sum, sq) => sum + sq.points, 0)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/admin/selections/${selectionId}`}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            선발공고로 돌아가기
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          새 시험 만들기
        </h1>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">
            시험 기본 정보
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                시험 제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 2025년 1차 코딩 테스트"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                시험 설명
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="응시자에게 표시될 시험 설명을 입력하세요."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                제한 시간 (분)
              </label>
              <input
                type="number"
                min={1}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                합격 기준 점수 (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">
              문제 은행
            </h2>

            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="문제 검색..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
                />
              </div>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">전체 카테고리</option>
                {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">전체 유형</option>
                {["객관식", "OX", "단답형", "서술형", "코딩"].map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
              <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">전체 난이도</option>
                {["하", "중", "상"].map((d) => (<option key={d} value={d}>{d}</option>))}
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-12">
                조건에 맞는 문제가 없습니다.
              </p>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filteredQuestions.map((q) => {
                  const selected = isSelected(q.id)
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestion(q)}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0 text-blue-500">
                        {selected ? (<CheckSquare className="w-4 h-4" />) : (<Square className="w-4 h-4 text-slate-400" />)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 dark:text-slate-100 line-clamp-2">{q.content}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {q.category && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{q.category}</span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLOR[q.type] ?? ""}`}>{q.type}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${DIFFICULTY_COLOR[q.difficulty] ?? ""}`}>난이도 {q.difficulty}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">선택된 문제</h2>
              <div className="text-xs text-slate-500 dark:text-slate-400">{selectedQuestions.length}문제 - 총 {totalPoints}점</div>
            </div>

            {selectedQuestions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center">왼쪽에서 문제를 선택하세요</p>
              </div>
            ) : (
              <div className="flex-1 space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {selectedQuestions.map((sq, index) => (
                  <div key={sq.question.id} className="flex items-start gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button onClick={() => moveQuestion(index, "up")} disabled={index === 0} className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <span className="text-xs text-slate-500 dark:text-slate-400 text-center font-mono">{index + 1}</span>
                      <button onClick={() => moveQuestion(index, "down")} disabled={index === selectedQuestions.length - 1} className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2">{sq.question.content}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLOR[sq.question.type] ?? ""}`}>{sq.question.type}</span>
                        <div className="flex items-center gap-1 ml-auto">
                          <label className="text-xs text-slate-500 dark:text-slate-400">점수</label>
                          <input
                            type="number"
                            min={1}
                            value={sq.points}
                            onChange={(e) => updatePoints(sq.question.id, Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            className="w-14 px-1.5 py-0.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeSelected(sq.question.id)} className="shrink-0 p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleSave}
                disabled={saving || !title.trim() || selectedQuestions.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 text-white font-medium text-sm transition-colors"
              >
                {saving ? (<><Loader2 className="w-4 h-4 animate-spin" />저장 중...</>) : (<><Plus className="w-4 h-4" />시험 저장</>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
