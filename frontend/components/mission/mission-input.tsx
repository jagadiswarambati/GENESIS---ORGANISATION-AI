"use client";

import { useId } from "react";

import { icons } from "@/lib/icons";

import { Button } from "@/components/design-system/button";

export function MissionInput({
  mission,
  onMissionChange,
  onSubmit,
  errorMessage,
}: Readonly<{
  errorMessage?: string;
  mission: string;
  onMissionChange: (mission: string) => void;
  onSubmit: () => void;
}>): React.JSX.Element {
  const inputId = useId();
  const MissionIcon = icons.mission;

  return (
    <section aria-labelledby="mission-title" className="max-w-reading mx-auto text-center">
      <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-2xl">
        <MissionIcon aria-hidden="true" size={22} />
      </div>
      <p className="text-label text-muted mt-6">Genesis</p>
      <h1 className="text-display mt-2" id="mission-title">
        Build Organizations.
        <br />
        Not Prompts.
      </h1>
      <p className="text-subtitle text-secondary mt-4">
        Describe the mission your organization should accomplish.
      </p>
      <form
        className="mt-10"
        onSubmit={(event) => {
          event.preventDefault();
          if (mission.trim()) onSubmit();
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          Organization mission
        </label>
        <textarea
          className="border-border bg-surface text-subtitle text-foreground shadow-soft duration-normal placeholder:text-muted focus:border-focus focus:shadow-raised min-h-32 w-full resize-none rounded-xl border p-4 outline-none transition-[border-color,box-shadow]"
          id={inputId}
          onChange={(event) => onMissionChange(event.target.value)}
          placeholder="What would you like your organization to achieve?"
          value={mission}
        />
        <div className="mt-4 flex justify-center">
          <Button disabled={!mission.trim()} size="lg" type="submit">
            Create Organization
            <icons.continue aria-hidden="true" size={16} />
          </Button>
        </div>
      </form>
      {errorMessage ? (
        <p className="text-body text-danger mt-4" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <p className="text-caption text-muted mt-5">
        Your mission becomes the starting point for an intelligent organization.
      </p>
    </section>
  );
}
