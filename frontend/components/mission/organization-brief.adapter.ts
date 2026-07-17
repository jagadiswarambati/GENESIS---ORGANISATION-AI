import type { OrganizationBlueprint } from "@/lib/api/architect";

import type { OrganizationBriefData } from "./organization-brief.types";

const dnaLabels: ReadonlyArray<keyof OrganizationBlueprint["dna"]> = [
  "speed",
  "quality",
  "creativity",
  "collaboration",
  "security",
];

/** Adapts the Architect's API contract to the presentation contract used by the Brief. */
export function toOrganizationBrief(blueprint: OrganizationBlueprint): OrganizationBriefData {
  return {
    organizationName: blueprint.organization_name,
    mission: blueprint.mission_summary,
    organizationType: blueprint.organization_type,
    culture: blueprint.suggested_culture,
    dna: dnaLabels.map((attribute) => ({
      label: attribute,
      summary: `${blueprint.dna[attribute]} / 100`,
    })),
    executionStrategy: blueprint.execution_strategy,
    departments: blueprint.departments.map((department) => ({
      name: department.name,
      mandate: department.mandate,
      roles: department.roles.length,
    })),
    estimatedWorkerCapacity: `${blueprint.worker_capacity} AI workers across ${blueprint.departments.length} departments`,
    estimatedDuration: blueprint.estimated_duration,
    confidence: {
      score: blueprint.confidence_score,
      description: "Confidence is based on the Architect's validated organization blueprint.",
    },
    risks: blueprint.risks,
    deliverables: blueprint.deliverables,
  };
}
