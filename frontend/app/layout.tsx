import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { NavbarWrapper } from "@/components/layout/navbar-wrapper";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KBrain-AX — AI·데이터 전문인재 선발 플랫폼",
  description: "루브릭 기반 서면평가부터 온라인 시험, 결과 관리까지 하나의 플랫폼에서",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background", inter.className)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NavbarWrapper />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
