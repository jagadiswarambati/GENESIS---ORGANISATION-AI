export type OrganizationBriefData = {
  confidence: {
    description: string;
    score: number;
  };
  culture: string;
  departments: ReadonlyArray<{
    mandate: string;
    name: string;
    roles: number;
  }>;
  deliverables: ReadonlyArray<string>;
  dna: ReadonlyArray<{
    label: string;
    summary: string;
  }>;
  estimatedDuration: string;
  estimatedWorkerCapacity: string;
  executionStrategy: string;
  mission: string;
  organizationName: string;
  organizationType: string;
  risks: ReadonlyArray<string>;
};
