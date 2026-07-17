import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card } from "@/components/design-system/card";
import { icons } from "@/lib/icons";

import { OrganizationBriefCard, OrganizationBriefList } from "./organization-brief-card";
import type { OrganizationBriefData } from "./organization-brief.types";

export function OrganizationBrief({
  brief,
  onApprove,
  onBack,
}: Readonly<{
  brief: OrganizationBriefData;
  onApprove: () => void;
  onBack: () => void;
}>): React.JSX.Element {
  const BriefIcon = icons.organization;
  return (
    <section aria-labelledby="brief-title" className="max-w-content mx-auto">
      <div className="max-w-reading mx-auto text-center">
        <span className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-2xl">
          <BriefIcon aria-hidden="true" size={21} />
        </span>
        <p className="text-label text-muted mt-5">Organization Brief</p>
        <h1 className="text-heading mt-2" id="brief-title">
          Review the organization before it begins.
        </h1>
        <p className="text-body text-secondary mt-3">
          A concise proposal for the structure, operating posture, and expected outcome.
        </p>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <OrganizationBriefCard
          className="lg:col-span-2"
          eyebrow="Organization"
          title={brief.organizationName}
        >
          <p className="text-label text-muted">Mission</p>
          <p className="text-body text-secondary">{brief.mission}</p>
        </OrganizationBriefCard>
        <OrganizationBriefCard eyebrow="Confidence" title={`${brief.confidence.score}%`}>
          <p className="text-body text-secondary">{brief.confidence.description}</p>
        </OrganizationBriefCard>
        <OrganizationBriefCard eyebrow="Organization type" title={brief.organizationType}>
          <p className="text-label text-muted">Culture</p>
          <Badge className="mt-2" tone="accent">
            {brief.culture}
          </Badge>
        </OrganizationBriefCard>
        <OrganizationBriefCard
          className="lg:col-span-2"
          eyebrow="Execution strategy"
          title="Proposed operating approach"
        >
          <p className="text-body text-secondary">{brief.executionStrategy}</p>
        </OrganizationBriefCard>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <OrganizationBriefCard eyebrow="Organization DNA" title="Initial operating character">
          <div className="divide-border divide-y">
            {brief.dna.map((dimension) => (
              <div
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                key={dimension.label}
              >
                <span className="text-body font-medium">{dimension.label}</span>
                <span className="text-caption text-secondary">{dimension.summary}</span>
              </div>
            ))}
          </div>
        </OrganizationBriefCard>
        <OrganizationBriefCard eyebrow="Capacity and duration" title="Initial execution envelope">
          <div className="space-y-4">
            <div>
              <p className="text-label text-muted">Worker capacity</p>
              <p className="text-body text-secondary mt-1">{brief.estimatedWorkerCapacity}</p>
            </div>
            <div>
              <p className="text-label text-muted">Estimated duration</p>
              <p className="text-body text-secondary mt-1">{brief.estimatedDuration}</p>
            </div>
          </div>
        </OrganizationBriefCard>
      </div>
      <OrganizationBriefCard
        className="mt-4"
        eyebrow="Departments"
        title="A focused initial structure"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {brief.departments.map((department) => (
            <Card className="bg-panel p-4" key={department.name}>
              <p className="text-subtitle font-medium">{department.name}</p>
              <p className="text-caption text-secondary mt-2">{department.mandate}</p>
              <p className="text-label text-muted mt-4">{department.roles} roles</p>
            </Card>
          ))}
        </div>
      </OrganizationBriefCard>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <OrganizationBriefCard eyebrow="Potential risks" title="Review before execution">
          <OrganizationBriefList items={brief.risks} />
        </OrganizationBriefCard>
        <OrganizationBriefCard
          eyebrow="Expected deliverables"
          title="What the organization will produce"
        >
          <OrganizationBriefList items={brief.deliverables} />
        </OrganizationBriefCard>
      </div>
      <div className="mt-8 flex items-center justify-between">
        <Button onClick={onBack} variant="ghost">
          <icons.back aria-hidden="true" size={16} />
          Back
        </Button>
        <Button onClick={onApprove} size="lg">
          Approve Organization
          <icons.approve aria-hidden="true" size={16} />
        </Button>
      </div>
    </section>
  );
}
