"use client";

import { AnimatePresence, motion as motionElement, useReducedMotion } from "framer-motion";
import { useCallback, useState } from "react";

import { Button } from "@/components/design-system/button";
import { ProgressBar } from "@/components/design-system/progress";
import { icons } from "@/lib/icons";
import { scaleIn } from "@/lib/motion";

type QuestionId = "priority" | "autonomy" | "memory" | "culture" | "scale";

type ArchitectQuestion = {
  description: string;
  id: QuestionId;
  options: ReadonlyArray<{ description: string; id: string; label: string; recommended?: boolean }>;
  title: string;
};

const QUESTIONS: ReadonlyArray<ArchitectQuestion> = [
  {
    id: "priority",
    title: "What should lead this organization?",
    description: "This sets its default operating posture.",
    options: [
      { id: "speed", label: "Speed", description: "Move quickly with lean review cycles." },
      { id: "quality", label: "Quality", description: "Favor depth, validation, and refinement." },
      {
        id: "balanced",
        label: "Balanced",
        description: "Balance momentum with dependable outcomes.",
        recommended: true,
      },
    ],
  },
  {
    id: "autonomy",
    title: "How should it make decisions?",
    description: "You can change this operating preference later.",
    options: [
      {
        id: "recommend",
        label: "Recommend",
        description: "Surface decisions for your consideration.",
        recommended: true,
      },
      { id: "approval", label: "Approval", description: "Pause before important decisions." },
      {
        id: "automatic",
        label: "Automatic",
        description: "Proceed within its agreed operating boundaries.",
      },
    ],
  },
  {
    id: "memory",
    title: "Should the organization retain knowledge?",
    description: "Memory allows future work to build on verified outcomes.",
    options: [
      {
        id: "yes",
        label: "Yes",
        description: "Preserve institutional context.",
        recommended: true,
      },
      { id: "no", label: "No", description: "Keep work scoped to each mission." },
    ],
  },
  {
    id: "culture",
    title: "Which culture best fits the mission?",
    description: "Culture provides a starting operating philosophy.",
    options: [
      { id: "startup", label: "Startup", description: "Decisive, adaptive, and fast." },
      { id: "research", label: "Research Lab", description: "Evidence-led and methodical." },
      { id: "creative", label: "Creative Studio", description: "Exploratory and expressive." },
      {
        id: "regulated",
        label: "Regulated Operations",
        description: "Controlled and verification-first.",
        recommended: true,
      },
    ],
  },
  {
    id: "scale",
    title: "What scale should Genesis prepare for?",
    description: "This shapes the initial organizational structure.",
    options: [
      { id: "small", label: "Small", description: "A focused organization for a single outcome." },
      {
        id: "growing",
        label: "Growing",
        description: "A durable starting structure.",
        recommended: true,
      },
      {
        id: "enterprise",
        label: "Enterprise",
        description: "A broader organization with clear boundaries.",
      },
    ],
  },
];

export function MissionArchitect({
  onBack,
  onComplete,
}: Readonly<{ onBack: () => void; onComplete: () => void }>): React.JSX.Element {
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<QuestionId, string>>>({});
  const reduceMotion = useReducedMotion();
  const question = QUESTIONS[activeQuestion];
  const selected = answers[question.id];
  const isFirstQuestion = activeQuestion === 0;
  const isLastQuestion = activeQuestion === QUESTIONS.length - 1;
  const progress = Math.round(((activeQuestion + 1) / QUESTIONS.length) * 100);

  const selectOption = useCallback(
    (optionId: string) => setAnswers((current) => ({ ...current, [question.id]: optionId })),
    [question.id],
  );

  const continueConversation = () => {
    if (!selected) return;
    if (isLastQuestion) onComplete();
    else setActiveQuestion((current) => current + 1);
  };

  const goBack = () => {
    if (isFirstQuestion) onBack();
    else setActiveQuestion((current) => current - 1);
  };

  const onKeyboardNavigation = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const optionIndex = Math.max(
      0,
      question.options.findIndex((option) => option.id === selected),
    );
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      selectOption(question.options[Math.min(question.options.length - 1, optionIndex + 1)].id);
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      selectOption(question.options[Math.max(0, optionIndex - 1)].id);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      continueConversation();
    }
  };

  return (
    <section aria-labelledby="architect-title" className="max-w-reading mx-auto">
      <div className="flex items-center justify-between gap-4">
        <Button aria-label="Go back" onClick={goBack} size="icon" variant="ghost">
          <icons.back aria-hidden="true" size={16} />
        </Button>
        <span className="text-caption text-muted">
          Question {activeQuestion + 1} of {QUESTIONS.length}
        </span>
      </div>
      <ProgressBar className="mt-5" value={progress} />
      <AnimatePresence mode="wait">
        <motionElement.div
          animate="visible"
          exit="exit"
          initial="hidden"
          key={question.id}
          variants={reduceMotion ? undefined : scaleIn}
        >
          <p className="text-label text-muted mt-10">Organization Architect</p>
          <h1 className="text-heading mt-2" id="architect-title">
            {question.title}
          </h1>
          <p className="text-body text-secondary mt-3">{question.description}</p>
          <div
            aria-label={question.title}
            className="mt-8 space-y-3"
            onKeyDown={onKeyboardNavigation}
            role="radiogroup"
            tabIndex={0}
          >
            {question.options.map((option) => {
              const isSelected = selected === option.id;
              return (
                <button
                  aria-checked={isSelected}
                  className={`duration-normal w-full rounded-xl border p-4 text-left transition-[border-color,background-color,box-shadow] ${isSelected ? "border-primary/60 bg-primary/10 shadow-raised" : "border-border bg-surface hover:bg-hover"}`}
                  key={option.id}
                  onClick={() => selectOption(option.id)}
                  role="radio"
                  type="button"
                >
                  <span className="flex items-start justify-between gap-4">
                    <span>
                      <span className="text-subtitle font-medium">{option.label}</span>
                      <span className="text-body text-secondary mt-1 block">
                        {option.description}
                      </span>
                    </span>
                    {option.recommended ? (
                      <span className="bg-primary/15 text-label text-primary rounded-full px-2 py-1">
                        Recommended
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </motionElement.div>
      </AnimatePresence>
      <div className="mt-8 flex items-center justify-between">
        <p className="text-caption text-muted">Use ↑ ↓ to choose · Enter to continue</p>
        <Button disabled={!selected} onClick={continueConversation}>
          {isLastQuestion ? "Generate Blueprint" : "Continue"}
          <icons.continue aria-hidden="true" size={16} />
        </Button>
      </div>
    </section>
  );
}
