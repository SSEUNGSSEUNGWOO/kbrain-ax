import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { icons } from "lucide-react";

interface FeaturesProps {
  icon: string;
  title: string;
  description: string;
}

const featureList: FeaturesProps[] = [
  {
    icon: "FileText",
    title: "지원서 온라인 접수",
    description:
      "지원자가 온라인으로 지원서와 과제 기획서를 제출하고 접수 현황을 실시간으로 확인합니다.",
  },
  {
    icon: "SlidersHorizontal",
    title: "루브릭 항목 설정",
    description:
      "지원동기, AI 경력, 현안 연결성, 데이터 활용 등 평가 항목과 배점을 자유롭게 구성합니다.",
  },
  {
    icon: "Bot",
    title: "AI 기반 자동 채점",
    description:
      "Claude AI가 루브릭 기준에 따라 지원서를 분석하고 항목별 점수와 피드백을 생성합니다.",
  },
  {
    icon: "GraduationCap",
    title: "온라인 시험 출제",
    description:
      "객관식 문제 은행을 구성하고 시험을 출제하여 서류 합격자에게 응시 기회를 제공합니다.",
  },
  {
    icon: "Timer",
    title: "시험 자동 채점",
    description:
      "제한 시간 내 응시한 시험을 자동으로 채점하고 합격 기준에 따라 결과를 즉시 산출합니다.",
  },
  {
    icon: "LayoutDashboard",
    title: "통합 관리 대시보드",
    description:
      "전체 지원자 현황, 평가 진행 상태, 시험 결과를 한 화면에서 관리하고 내보낼 수 있습니다.",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="container py-24 sm:py-32">
      <h2 className="text-lg text-primary text-center mb-2 tracking-wider">
        주요 기능
      </h2>

      <h2 className="text-3xl md:text-4xl text-center font-bold mb-4">
        선발의 전 과정을 하나로
      </h2>

      <h3 className="md:w-1/2 mx-auto text-xl text-center text-muted-foreground mb-8">
        지원서 접수부터 AI 평가, 온라인 시험, 결과 관리까지 KBrain-AX 하나로 해결합니다.
      </h3>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {featureList.map(({ icon, title, description }) => (
          <div key={title}>
            <Card className="h-full bg-background border-0 shadow-none">
              <CardHeader className="flex justify-center items-center">
                <div className="bg-primary/20 p-2 rounded-full ring-8 ring-primary/10 mb-4">
                  <Icon
                    name={icon as keyof typeof icons}
                    size={24}
                    color="hsl(var(--primary))"
                    className="text-primary"
                  />
                </div>

                <CardTitle>{title}</CardTitle>
              </CardHeader>

              <CardContent className="text-muted-foreground text-center">
                {description}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
};
