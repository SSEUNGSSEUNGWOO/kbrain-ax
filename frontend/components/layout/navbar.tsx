"use client";
import { Menu } from "lucide-react";
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import Link from "next/link";
import Image from "next/image";
import { ToggleTheme } from "./toogle-theme";

interface RouteProps {
  href: string;
  label: string;
}

const routeList: RouteProps[] = [
  { href: "#benefits", label: "About" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <header className="w-full sticky top-0 z-40 border-b border-secondary bg-card/95 backdrop-blur-sm">
      <div className="relative mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">

        {/* 로고 */}
        <Link href="/" className="font-bold text-lg flex items-center gap-2 flex-shrink-0">
          <Image src="/logo.png" alt="KBrain-AX" width={32} height={32} className="rounded-md" />
          KBrain-AX
        </Link>

        {/* 가운데 메뉴 (데스크탑) */}
        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">
          {routeList.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm px-4 py-2 rounded-md hover:bg-muted hover:text-primary transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* 오른쪽 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden lg:block">
            <ToggleTheme />
          </div>

          {/* 데스크탑 */}
          <div className="hidden lg:flex items-center gap-2">
            <Button asChild size="sm">
              <Link href="/signin">로그인</Link>
            </Button>
          </div>

          {/* 모바일 */}
          <div className="flex items-center lg:hidden ml-2">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Menu onClick={() => setIsOpen(!isOpen)} className="cursor-pointer" />
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col justify-between rounded-tr-2xl rounded-br-2xl bg-card border-secondary">
                <div>
                  <SheetHeader className="mb-4 ml-4">
                    <SheetTitle className="flex items-center">
                      <Link href="/" className="flex items-center gap-2">
                        <Image src="/logo.png" alt="KBrain-AX" width={28} height={28} className="rounded-md" />
                        KBrain-AX
                      </Link>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-2">
                    {routeList.map(({ href, label }) => (
                      <Button key={href} onClick={() => setIsOpen(false)} asChild variant="ghost" className="justify-start text-base">
                        <Link href={href}>{label}</Link>
                      </Button>
                    ))}
                    <Separator className="my-2" />
                    <Button asChild className="justify-start text-base">
                      <Link href="/signin">로그인</Link>
                    </Button>
                  </div>
                </div>
                <SheetFooter className="flex-col sm:flex-col justify-start items-start">
                  <Separator className="mb-2" />
                  <ToggleTheme />
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

      </div>
    </header>
  );
};
