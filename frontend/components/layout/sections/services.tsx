import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, BookOpen, BrainCircuit, BarChart3 } from "lucide-react";

interface ServiceProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const serviceList: ServiceProps[] = [
  {
    icon: FileText,
    title: "지원서 수집 및 관리",
    description:
      "전형별 지원서 항목을 자유롭게 설계하고, 지원자 현황을 한눈에 확인하세요.",
  },
  {
    icon: BrainCircuit,
    title: "AI 루브릭 서면 심사",
    description:
      "평가 기준(루브릭)을 설정하면 AI가 지원서를 자동으로 분석해 점수와 피드백을 생성합니다.",
  },
  {
    icon: BookOpen,
    title: "온라인 시험",
    description:
      "객관식·서술형·코딩 등 다양한 문제 유형을 지원하며, 부정행위 방지 기능이 내장되어 있습니다.",
  },
  {
    icon: BarChart3,
    title: "결과 대시보드",
    description:
      "전형 단계별 합격·불합격 현황, 점수 분포, 지원자 통계를 실시간으로 확인하세요.",
  },
];

export const ServicesSection = () => {
  return (
    <section id="services" className="container py-24 sm:py-32">
      <h2 className="text-lg text-primary text-center mb-2 tracking-wider">
        Services
      </h2>

      <h2 className="text-3xl md:text-4xl text-center font-bold mb-4">
        선발 전형의 모든 단계를 하나로
      </h2>
      <h3 className="md:w-1/2 mx-auto text-xl text-center text-muted-foreground mb-10">
        지원 접수부터 AI 심사, 온라인 시험, 최종 결과 발표까지
        KBrain-AX 하나로 운영하세요.
      </h3>

      <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4 w-full lg:w-[60%] mx-auto">
        {serviceList.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="bg-muted/60 dark:bg-card h-full">
            <CardHeader>
              <div className="mb-2">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
};
