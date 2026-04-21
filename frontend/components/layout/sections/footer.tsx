import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import Link from "next/link";

export const FooterSection = () => {
  return (
    <footer id="footer" className="container py-24 sm:py-32">
      <div className="p-10 bg-card border border-secondary rounded-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-12 gap-y-8">
          <div className="col-span-full xl:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="KBrain-AX" width={28} height={28} className="rounded-md" />
              <span className="text-xl font-bold">KBrain-AX</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
              AI·데이터 전문인재 선발을 위한 통합 플랫폼
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-lg">플랫폼</h3>
            <Link href="/#features" className="opacity-60 hover:opacity-100 text-sm">주요 기능</Link>
            <Link href="/#services" className="opacity-60 hover:opacity-100 text-sm">서비스</Link>
            <Link href="/#faq" className="opacity-60 hover:opacity-100 text-sm">FAQ</Link>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-lg">지원자</h3>
            <Link href="/signin" className="opacity-60 hover:opacity-100 text-sm">로그인</Link>
            <Link href="/dashboard" className="opacity-60 hover:opacity-100 text-sm">대시보드</Link>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-lg">관리자</h3>
            <Link href="/admin" className="opacity-60 hover:opacity-100 text-sm">관리자 대시보드</Link>
            <Link href="/#contact" className="opacity-60 hover:opacity-100 text-sm">도입 문의</Link>
          </div>
        </div>

        <Separator className="my-6" />
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} KBrain-AX. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
