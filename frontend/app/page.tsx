import Link from "next/link";
import { BenefitsSection } from "@/components/layout/sections/benefits";
import { CommunitySection } from "@/components/layout/sections/community";
import { ContactSection } from "@/components/layout/sections/contact";
import { FAQSection } from "@/components/layout/sections/faq";
import { FeaturesSection } from "@/components/layout/sections/features";
import { FooterSection } from "@/components/layout/sections/footer";
import { HeroSection } from "@/components/layout/sections/hero";
import { PricingSection } from "@/components/layout/sections/pricing";
import { ServicesSection } from "@/components/layout/sections/services";
import { SponsorsSection } from "@/components/layout/sections/sponsors";
import { TeamSection } from "@/components/layout/sections/team";
import { TestimonialSection } from "@/components/layout/sections/testimonial";

export const metadata = {
  title: "KBrain-AX — AI·데이터 전문인재 선발 플랫폼",
  description: "루브릭 기반 서면평가부터 온라인 시험, 결과 관리까지 하나의 플랫폼에서",
};

export default function Home() {
  return (
    <>
      {/* 테스트용 바로가기 */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <Link
          href="/admin"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors text-center"
        >
          관리자 대시보드
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-primary bg-background px-4 py-2 text-sm font-medium text-primary shadow-lg hover:bg-muted transition-colors text-center"
        >
          지원자 대시보드
        </Link>
      </div>

      <HeroSection />
      <SponsorsSection />
      <BenefitsSection />
      <FeaturesSection />
      <ServicesSection />
      <TestimonialSection />
      <TeamSection />
      <CommunitySection />
      <PricingSection />
      <ContactSection />
      <FAQSection />
      <FooterSection />
    </>
  );
}
