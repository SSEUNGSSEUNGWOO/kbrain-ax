"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { Loader2, User } from "lucide-react"

export default function ProfileSetupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/signin")
        return
      }
      setLoading(false)
    })
  }, [router])

  async function handleSave() {
    const trimmed = fullName.trim()
    if (!trimmed) { setError("이름을 입력해 주세요."); return }
    setSaving(true)
    setError("")

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/signin"); return }

    const { error: err } = await supabase
      .from("profiles")
      .update({ full_name: trimmed })
      .eq("id", user.id)

    if (err) {
      setError("저장 중 오류가 발생했습니다. 다시 시도해 주세요.")
      setSaving(false)
      return
    }

    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-secondary bg-card p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="KBrain-AX" width={48} height={48} className="rounded-xl" />
          <h1 className="text-xl font-bold">이름 확인</h1>
          <p className="text-sm text-muted-foreground text-center">
            시험 및 지원서에 사용될 본명을 입력해 주세요.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              성명 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={fullName}
                onChange={e => { setFullName(e.target.value); setError("") }}
                onKeyDown={e => { if (e.key === "Enter") handleSave() }}
                placeholder="홍길동"
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            입력하신 이름은 지원서, 시험 답안, 합격 통보 등에 사용됩니다. 반드시 실명을 입력해 주세요.
          </p>

          <button
            onClick={handleSave}
            disabled={saving || !fullName.trim()}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />저장 중...</> : "저장하고 시작하기"}
          </button>
        </div>
      </div>
    </div>
  )
}
