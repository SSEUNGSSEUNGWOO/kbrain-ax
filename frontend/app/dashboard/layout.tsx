"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { LayoutDashboard, FileText, BookOpen, LogOut, Menu, X, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const NAV = [
  { href: "/dashboard",             icon: LayoutDashboard, label: "대시보드" },
  { href: "/dashboard/application", icon: FileText,         label: "지원서" },
  { href: "/dashboard/exams",       icon: BookOpen,         label: "시험" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Auth stub: skip auth check, show a placeholder user
  const user = {
    name: "지원자",
    email: "user@kbrain.kr",
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {open && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-60
        flex flex-col bg-slate-900 dark:bg-slate-950
        border-r border-slate-800 transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="h-14 flex items-center px-4 border-b border-slate-800 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="KBrain-AX" width={26} height={26} className="rounded-md" />
            <span className="text-white font-semibold text-sm">KBrain-AX</span>
          </Link>
          <button onClick={() => setOpen(false)} className="ml-auto text-slate-500 hover:text-white lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <User className="h-3.5 w-3.5 text-slate-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-slate-700/50 border border-slate-600/30 px-1.5 py-0.5">
            <span className="text-[10px] font-medium text-slate-400">지원자</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)
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

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 lg:hidden flex-shrink-0">
          <button onClick={() => setOpen(true)} className="text-slate-500 hover:text-slate-700">
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
            {NAV.find(n => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.label ?? "대시보드"}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
