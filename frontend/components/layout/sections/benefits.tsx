import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { icons } from "lucide-react";

interface BenefitsProps {
  icon: string;
  title: string;
  description: string;
}

const benefitList: BenefitsProps[] = [
  {
    icon: "ClipboardList",
    title: "일관된 평가 기준",
    description:
      "루브릭 기반 채점으로 평가자마다 다른 기준을 없애고, 누구나 동일한 기준으로 공정하게 평가합니다.",
  },
  {
    icon: "BrainCircuit",
    title: "AI 자동 평가",
    description:
      "지원서를 AI가 루브릭 항목별로 자동 분석하여 평가 시간을 단축하고 담당자의 부담을 줄입니다.",
  },
  {
    icon: "PenLine",
    title: "온라인 시험 관리",
    description:
      "문제 출제부터 시험 응시, 자동 채점까지 하나의 플랫폼에서 완결됩니다.",
  },
  {
    icon: "BarChart3",
    title: "선발 현황 한눈에",
    description:
      "지원자별 평가 점수, 시험 결과, 선발 상태를 대시보드에서 실시간으로 확인할 수 있습니다.",
  },
];

export const BenefitsSection = () => {
  return (
    <section id="benefits" className="container py-24 sm:py-32">
      <div className="grid lg:grid-cols-2 place-items-center lg:gap-24">
        <div>
          <h2 className="text-lg text-primary mb-2 tracking-wider">왜 KBrain-AX인가요?</h2>

          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            선발 과정의 공정성과 효율성을 동시에
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            기존의 주관적 평가와 수작업 관리에서 벗어나, AI 기반의 체계적인 선발 프로세스를 도입하세요.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 w-full">
          {benefitList.map(({ icon, title, description }, index) => (
            <Card
              key={title}
              className="bg-muted/50 dark:bg-card hover:bg-background transition-all delay-75 group/number"
            >
              <CardHeader>
                <div className="flex justify-between">
                  <Icon
                    name={icon as keyof typeof icons}
                    size={32}
                    color="hsl(var(--primary))"
                    className="mb-6 text-primary"
                  />
                  <span className="text-5xl text-muted-foreground/15 font-medium transition-all delay-75 group-hover/number:text-muted-foreground/30">
                    0{index + 1}
                  </span>
                </div>

                <CardTitle>{title}</CardTitle>
              </CardHeader>

              <CardContent className="text-muted-foreground">
                {description}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
