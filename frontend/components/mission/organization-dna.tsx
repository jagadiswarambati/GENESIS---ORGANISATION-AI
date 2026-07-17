"use client";

import { motion as motionElement, useReducedMotion } from "framer-motion";
import { useState } from "react";

import { Button } from "@/components/design-system/button";
import { Card } from "@/components/design-system/card";
import { DnaSlider } from "@/components/design-system/dna-slider";
import { icons } from "@/lib/icons";
import { scaleIn } from "@/lib/motion";

const INITIAL_DNA = {
  collaboration: 76,
  creativity: 64,
  quality: 72,
  speed: 68,
} as const;

type DnaAttribute = keyof typeof INITIAL_DNA;

const DNA_COPY: Record<DnaAttribute, { description: string; label: string }> = {
  speed: { label: "Speed", description: "Favors timely progress and concise execution loops." },
  quality: { label: "Quality", description: "Adds refinement and validation where it matters." },
  creativity: {
    label: "Creativity",
    description: "Encourages broader exploration and original thinking.",
  },
  collaboration: {
    label: "Collaboration",
    description: "Strengthens handoffs and shared organizational context.",
  },
};

export function OrganizationDna({
  onBack,
  onReview,
}: Readonly<{ onBack: () => void; onReview: () => void }>): React.JSX.Element {
  const [dna, setDna] = useState(INITIAL_DNA);
  const reduceMotion = useReducedMotion();
  const DnaIcon = icons.organization;

  return (
    <section aria-labelledby="dna-title" className="max-w-reading mx-auto">
      <motionElement.div
        animate="visible"
        initial="hidden"
        variants={reduceMotion ? undefined : scaleIn}
      >
        <div className="text-center">
          <span className="bg-accent/15 text-accent mx-auto flex size-12 items-center justify-center rounded-2xl">
            <DnaIcon aria-hidden="true" size={21} />
          </span>
          <p className="text-label text-muted mt-5">Organization DNA</p>
          <h1 className="text-heading mt-2" id="dna-title">
            The organization&apos;s initial operating character.
          </h1>
          <p className="text-body text-secondary mt-3">
            These visual settings establish the balance Genesis will use as it prepares the
            organization.
          </p>
        </div>
        <Card className="mt-8 space-y-7 p-6">
          {(Object.keys(DNA_COPY) as DnaAttribute[]).map((attribute) => (
            <DnaSlider
              description={DNA_COPY[attribute].description}
              key={attribute}
              label={DNA_COPY[attribute].label}
              onValueChange={(value) => setDna((current) => ({ ...current, [attribute]: value }))}
              value={dna[attribute]}
            />
          ))}
        </Card>
        <div className="mt-7 flex items-center justify-between">
          <Button onClick={onBack} variant="ghost">
            <icons.back aria-hidden="true" size={16} />
            Back
          </Button>
          <Button onClick={onReview} size="lg">
            Review Organization
            <icons.continue aria-hidden="true" size={16} />
          </Button>
        </div>
      </motionElement.div>
    </section>
  );
}
