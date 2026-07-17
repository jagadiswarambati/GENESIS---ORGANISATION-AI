import type { ProviderHealth } from "@/lib/api/execution";

export type ComponentStatus =
  "operational" | "configured" | "not_configured" | "unavailable" | "not_applicable";

export type SystemReadiness =
  "ready" | "environment_prerequisites_pending" | "provider_attention_required";

export type ComponentHealth = {
  status: ComponentStatus;
  summary: string;
  url: string | null;
};

export type EnvironmentConfiguration = {
  database_url_configured: boolean;
  environment: string;
  frontend_origin: string;
  openai_api_key_configured: boolean;
  openai_model: string;
  redis_url_configured: boolean;
};

export type RuntimePrerequisite = {
  name: string;
  required_for: string;
  status: "available" | "missing" | "not_applicable";
  summary: string;
};

export type SystemHealth = {
  active_ai_provider: ProviderHealth;
  api_connectivity: ComponentHealth;
  backend: ComponentHealth;
  environment: EnvironmentConfiguration;
  frontend: ComponentHealth;
  missing_dependencies: string[];
  prerequisites: RuntimePrerequisite[];
  readiness: SystemReadiness;
  startup_messages: string[];
};

type ApiErrorPayload = { message?: string };

export class SystemHealthApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SystemHealthApiError";
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Reads non-secret startup diagnostics without changing mission or execution state. */
export async function requestSystemHealth(): Promise<SystemHealth> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/system-health`);
  } catch {
    throw new SystemHealthApiError(
      "Genesis could not reach System Health. Check that the backend is running.",
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new SystemHealthApiError(
      payload.message ?? "Genesis could not read startup diagnostics.",
    );
  }

  return (await response.json()) as SystemHealth;
}
