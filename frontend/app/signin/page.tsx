import Image from "next/image"
import Link from "next/link"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-secondary bg-card p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="KBrain-AX" width={48} height={48} className="rounded-xl" />
          <h1 className="text-xl font-bold">KBrain-AX</h1>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-sm font-medium text-amber-800">로그인 기능 준비 중입니다</p>
          <p className="text-xs text-amber-600 mt-1">인증 시스템을 마이그레이션하고 있습니다.</p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">홈으로 돌아가기</Link>
        </p>
      </div>
    </div>
  )
}
