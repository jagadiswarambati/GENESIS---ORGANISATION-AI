"use client";

import { motion as motionElement, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { icons } from "@/lib/icons";
import { organizationGeneration, pulse } from "@/lib/motion";

const STAGES = [
  "Analyzing Mission",
  "Understanding Requirements",
  "Selecting Organization Pattern",
  "Generating Blueprint",
  "Preparing Organization",
] as const;
const STAGE_DURATION_MS = 720;

export function OrganizationPreparation({
  onComplete,
}: Readonly<{ onComplete: () => void }>): React.JSX.Element {
  const [activeStage, setActiveStage] = useState(0);
  const reduceMotion = useReducedMotion();
  const BrandIcon = icons.organization;

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        if (activeStage === STAGES.length - 1) onComplete();
        else setActiveStage((current) => current + 1);
      },
      reduceMotion ? 0 : STAGE_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [activeStage, onComplete, reduceMotion]);

  return (
    <section aria-live="polite" className="max-w-reading mx-auto">
      <div className="flex flex-col items-center text-center">
        <motionElement.div
          animate="thinking"
          className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl"
          initial="idle"
          variants={reduceMotion ? undefined : organizationGeneration}
        >
          <BrandIcon aria-hidden="true" size={24} />
        </motionElement.div>
        <p className="text-label text-muted mt-6">Genesis is forming your organization</p>
        <h1 className="text-heading mt-2">Preparing the operating model.</h1>
      </div>
      <ol className="mt-10 space-y-2">
        {STAGES.map((stage, index) => {
          const isComplete = index < activeStage;
          const isActive = index === activeStage;
          const Icon = isComplete ? icons.complete : isActive ? icons.loading : icons.pending;

          return (
            <li className="flex items-center gap-3 rounded-lg px-3 py-3" key={stage}>
              <motionElement.span
                animate={isActive ? "active" : "idle"}
                className={isComplete ? "text-success" : isActive ? "text-primary" : "text-muted"}
                initial="idle"
                variants={isActive && !reduceMotion ? pulse : undefined}
              >
                <Icon
                  aria-hidden="true"
                  className={isActive ? "animate-soft-spin" : undefined}
                  size={17}
                />
              </motionElement.span>
              <span className={isActive ? "text-body font-medium" : "text-body text-secondary"}>
                {stage}
              </span>
              {isComplete ? (
                <span className="text-caption text-success ml-auto">Complete</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
