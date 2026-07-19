class ArchitectError(Exception):
    """Expected failure while creating an organization blueprint."""

    code = "organization_architect_error"
    message = "Genesis could not create an organization blueprint."
    status_code = 502


class ArchitectConfigurationError(ArchitectError):
    code = "organization_architect_unavailable"
    message = (
        "The Organization Architect provider is not configured. Configure its required "
        "credentials or local runtime, then try again."
    )
    status_code = 503


class ArchitectProviderError(ArchitectError):
    code = "organization_architect_provider_error"
    message = "The Organization Architect is temporarily unavailable."
    status_code = 502


class ArchitectModelUnavailableError(ArchitectError):
    code = "organization_architect_model_unavailable"
    message = "The configured AI model is unavailable. Update the model setting and try again."
    status_code = 503


class ArchitectRateLimitError(ArchitectError):
    code = "organization_architect_rate_limited"
    message = (
        "The Organization Architect has reached the configured provider's rate or quota limit. "
        "Review provider usage and billing, then try again."
    )
    status_code = 429


class ArchitectTimeoutError(ArchitectError):
    code = "organization_architect_timeout"
    message = "The Organization Architect took too long to respond."
    status_code = 504


class ArchitectValidationError(ArchitectError):
    code = "organization_architect_invalid_response"
    message = "The Organization Architect returned an invalid blueprint."
    status_code = 502


class OllamaUnavailableError(ArchitectError):
    code = "organization_architect_ollama_unavailable"
    message = (
        "Ollama is not running or is not reachable at GENESIS_OLLAMA_BASE_URL. "
        "Start Ollama and try again."
    )
    status_code = 503


class OllamaModelUnavailableError(ArchitectError):
    code = "organization_architect_ollama_model_unavailable"
    message = (
        "The configured Ollama model is not installed. Install GENESIS_OLLAMA_MODEL and try again."
    )
    status_code = 503


class OllamaInvalidJsonError(ArchitectValidationError):
    code = "organization_architect_ollama_invalid_response"
    message = "Ollama returned an invalid organization blueprint after a retry."


class ExecutionProviderError(Exception):
    """Expected failure while selecting or calling the configured execution provider."""

    code = "execution_provider_error"
    message = "Genesis could not execute the ready tasks with the configured provider."
    status_code = 502


class ExecutionProviderConfigurationError(ExecutionProviderError):
    code = "execution_provider_configuration_error"
    message = (
        "The selected provider is not configured. Set the applicable API key "
        "(OPENAI_API_KEY or GEMINI_API_KEY), configure Ollama, or choose Mock AI."
    )
    status_code = 503


class ExecutionProviderUnavailableError(ExecutionProviderError):
    code = "execution_provider_unavailable"
    message = "The selected execution provider is temporarily unavailable."
    status_code = 502


class CollaborativeExecutionDeferredError(ExecutionProviderError):
    """Collaborative enrichment exceeded its background time budget."""

    code = "collaborative_execution_deferred"
    message = (
        "Large collaborative artifacts are still being generated. You can continue using "
        "Genesis while generation resumes in the background."
    )
    status_code = 504


class ProjectReviewError(Exception):
    """Expected failure while reviewing or selectively refining a generated project."""

    code = "project_review_error"
    message = "Genesis could not review the generated project."
    status_code = 502


class ProjectReviewConfigurationError(ProjectReviewError):
    code = "project_review_configuration_error"
    message = (
        "The configured project reviewer requires its provider API key. "
        "Use Mock AI, configure OPENAI_API_KEY or GEMINI_API_KEY, or configure Ollama."
    )
    status_code = 503


class ProjectReviewProviderUnavailableError(ProjectReviewError):
    code = "project_review_provider_unavailable"
    message = "The selected project review provider is temporarily unavailable."
    status_code = 502


class ProjectReviewDeferredError(ProjectReviewError):
    """The optional project review exceeded its background time budget."""

    code = "project_review_deferred"
    message = "Project Review is still being prepared in the background."
    status_code = 504


class ProjectReviewValidationError(ProjectReviewError):
    code = "project_refinement_invalid_request"
    message = "The selected suggestions cannot be refined for the current project revision."
    status_code = 422
