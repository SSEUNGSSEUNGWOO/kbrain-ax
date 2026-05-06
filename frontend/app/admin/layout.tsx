"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  LayoutDashboard, ListChecks, BookMarked,
  LogOut, Menu, X, ShieldCheck
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const NAV = [
  { href: "/admin",               icon: LayoutDashboard, label: "대시보드" },
  { href: "/admin/selections",    icon: ListChecks,      label: "선발 전형" },
  { href: "/admin/question-bank", icon: BookMarked,      label: "문제 은행" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Auth stub: skip auth check, show a placeholder admin user
  const user = {
    name: "관리자",
    email: "admin@kbrain.kr",
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* 모바일 오버레이 */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* 사이드바 */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-60
        flex flex-col bg-slate-900 dark:bg-slate-950
        border-r border-slate-800 transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* 로고 */}
        <div className="h-14 flex items-center px-4 border-b border-slate-800 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="KBrain-AX" width={26} height={26} className="rounded-md" />
            <span className="text-white font-semibold text-sm">KBrain-AX</span>
          </Link>
          <button onClick={() => setOpen(false)} className="ml-auto text-slate-500 hover:text-white lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 유저 */}
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-600/20 border border-blue-500/30 px-1.5 py-0.5">
            <ShieldCheck className="h-2.5 w-2.5 text-blue-400" />
            <span className="text-[10px] font-semibold text-blue-400">관리자</span>
          </div>
        </div>

        {/* 네비 */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* 로그아웃 */}
        <div className="px-3 py-3 border-t border-slate-800">
          <button
            onClick={() => router.replace("/")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 모바일 상단바 */}
        <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 lg:hidden flex-shrink-0">
          <button onClick={() => setOpen(true)} className="text-slate-500 hover:text-slate-700">
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
            {NAV.find(n => pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href)))?.label ?? "관리자"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
