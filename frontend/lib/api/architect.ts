export type OrganizationBlueprint = {
  confidence_score: number;
  departments: Array<{
    mandate: string;
    name: string;
    roles: Array<{
      name: string;
      responsibility: string;
      worker_count: number;
    }>;
  }>;
  deliverables: string[];
  dna: {
    collaboration: number;
    creativity: number;
    quality: number;
    security: number;
    speed: number;
  };
  estimated_duration: string;
  execution_strategy: string;
  mission_summary: string;
  organization_name: string;
  organization_type: string;
  risks: string[];
  suggested_culture: string;
  worker_capacity: number;
};

type ApiErrorPayload = { code?: string; message?: string };

export class ArchitectApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({
    code,
    message,
    status,
  }: Readonly<{ code: string; message: string; status: number }>) {
    super(message);
    this.name = "ArchitectApiError";
    this.code = code;
    this.status = status;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function requestOrganizationBlueprint(
  mission: string,
): Promise<OrganizationBlueprint> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/architect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mission }),
    });
  } catch {
    throw new ArchitectApiError({
      code: "organization_architect_unreachable",
      message: "Genesis could not reach the Organization Architect. Please try again.",
      status: 0,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ArchitectApiError({
      code: payload.code ?? "organization_architect_error",
      message: payload.message ?? "Genesis could not create an organization blueprint.",
      status: response.status,
    });
  }

  return (await response.json()) as OrganizationBlueprint;
}
