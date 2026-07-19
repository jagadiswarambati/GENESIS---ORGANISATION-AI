"use client";

import { AnimatePresence, motion as motionElement, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { icons } from "@/lib/icons";
import {
  ArchitectApiError,
  requestOrganizationBlueprint,
  type OrganizationBlueprint as OrganizationBlueprintResponse,
} from "@/lib/api/architect";
import { fade, pageTransition } from "@/lib/motion";
import { saveMissionControlSession } from "@/lib/mission-control-session";

import { MissionInput } from "./mission-input";
import { MissionArchitect } from "./mission-architect";
import { OrganizationBlueprint } from "./organization-blueprint";
import { OrganizationBrief } from "./organization-brief";
import { toOrganizationBrief } from "./organization-brief.adapter";
import { OrganizationDna } from "./organization-dna";
import { OrganizationPreparation } from "./organization-preparation";

type ExperienceStep = "mission" | "preparation" | "architect" | "blueprint" | "dna" | "brief";

export function MissionInitiation(): React.JSX.Element {
  const [mission, setMission] = useState("");
  const [step, setStep] = useState<ExperienceStep>("mission");
  const [blueprint, setBlueprint] = useState<OrganizationBlueprintResponse | null>(null);
  const [isPreparationComplete, setIsPreparationComplete] = useState(false);
  const [architectError, setArchitectError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const BrandIcon = icons.organization;

  const createOrganization = async () => {
    setArchitectError(null);
    setBlueprint(null);
    setIsPreparationComplete(false);
    setStep("preparation");

    try {
      const result = await requestOrganizationBlueprint(mission);
      setBlueprint(result);
    } catch (error) {
      const message =
        error instanceof ArchitectApiError
          ? error.message
          : "Genesis could not create an organization blueprint.";
      setArchitectError(message);
      setStep("mission");
    }
  };

  const completePreparation = () => {
    setIsPreparationComplete(true);
  };

  const continueToMissionControl = () => {
    if (!blueprint) return;

    saveMissionControlSession(blueprint);
    router.push("/mission-control");
  };

  useEffect(() => {
    if (step === "preparation" && blueprint && isPreparationComplete) {
      setStep("architect");
    }
  }, [blueprint, isPreparationComplete, step]);

  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-content mx-auto flex min-h-screen w-full flex-col px-5 py-6 sm:px-8">
        <header className="flex h-9 items-center justify-between">
          <div className="text-secondary flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
              <BrandIcon aria-hidden="true" size={15} />
            </span>
            <span className="text-title text-foreground">Genesis</span>
          </div>
          {step !== "mission" ? (
            <span className="text-caption text-muted">Organization formation</span>
          ) : null}
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <AnimatePresence mode="wait">
            <motionElement.div
              animate="enter"
              className="w-full"
              exit="exit"
              initial="initial"
              key={step}
              variants={reduceMotion ? fade : pageTransition}
            >
              {step === "mission" ? (
                <MissionInput
                  mission={mission}
                  onMissionChange={setMission}
                  onSubmit={createOrganization}
                  errorMessage={architectError ?? undefined}
                />
              ) : null}
              {step === "preparation" ? (
                <OrganizationPreparation onComplete={completePreparation} />
              ) : null}
              {step === "architect" && blueprint ? (
                <MissionArchitect
                  onBack={() => setStep("mission")}
                  onComplete={() => setStep("blueprint")}
                />
              ) : null}
              {step === "blueprint" && blueprint ? (
                <OrganizationBlueprint
                  blueprint={blueprint}
                  onBack={() => setStep("architect")}
                  onContinue={() => setStep("dna")}
                />
              ) : null}
              {step === "dna" && blueprint ? (
                <OrganizationDna
                  onBack={() => setStep("blueprint")}
                  onReview={() => setStep("brief")}
                />
              ) : null}
              {step === "brief" && blueprint ? (
                <OrganizationBrief
                  brief={toOrganizationBrief(blueprint)}
                  onApprove={continueToMissionControl}
                  onBack={() => setStep("dna")}
                />
              ) : null}
            </motionElement.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
