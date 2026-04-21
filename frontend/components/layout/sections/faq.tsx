import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQProps {
  question: string;
  answer: string;
  value: string;
}

const FAQList: FAQProps[] = [
  {
    question: "지원서는 제출 후 수정할 수 있나요?",
    answer:
      "제출된 지원서는 수정이 불가합니다. 제출 전 대시보드에서 내용을 충분히 검토한 후 제출해 주세요.",
    value: "item-1",
  },
  {
    question: "AI 서면 심사는 어떻게 이루어지나요?",
    answer:
      "관리자가 설정한 루브릭(평가 기준) 항목에 따라 AI가 지원서를 분석하고 항목별 점수와 피드백을 자동으로 생성합니다. 최종 합격 여부는 담당자가 AI 결과를 참고하여 결정합니다.",
    value: "item-2",
  },
  {
    question: "온라인 시험 응시 중 인터넷이 끊기면 어떻게 되나요?",
    answer:
      "시험 중 답안은 30초마다 자동으로 저장됩니다. 재접속 후 동일 계정으로 로그인하면 저장된 답안에서 이어서 응시할 수 있으며, 남은 시간도 그대로 유지됩니다.",
    value: "item-3",
  },
  {
    question: "시험 결과는 언제 확인할 수 있나요?",
    answer:
      "객관식·단답형 문제는 제출 즉시 자동 채점 결과를 확인할 수 있습니다. 서술형·코딩 문제는 수동 채점이 완료된 후 대시보드에서 확인 가능합니다.",
    value: "item-4",
  },
  {
    question: "웹캠이 없어도 시험에 응시할 수 있나요?",
    answer:
      "전형에 따라 웹캠 사용 여부가 다를 수 있습니다. 웹캠이 없는 경우에도 시험 응시는 가능하지만, 감독 목적으로 웹캠 사용을 권장합니다.",
    value: "item-5",
  },
];

export const FAQSection = () => {
  return (
    <section id="faq" className="container md:w-[700px] py-24 sm:py-32">
      <div className="text-center mb-8">
        <h2 className="text-lg text-primary text-center mb-2 tracking-wider">
          FAQ
        </h2>

        <h2 className="text-3xl md:text-4xl text-center font-bold">
          자주 묻는 질문
        </h2>
      </div>

      <Accordion type="single" collapsible className="AccordionRoot">
        {FAQList.map(({ question, answer, value }) => (
          <AccordionItem key={value} value={value}>
            <AccordionTrigger className="text-left">
              {question}
            </AccordionTrigger>
            <AccordionContent>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};
