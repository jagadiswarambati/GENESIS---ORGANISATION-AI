class ArchitectError(Exception):
    """Expected failure while creating an organization blueprint."""

    code = "organization_architect_error"
    message = "Genesis could not create an organization blueprint."
    status_code = 502


class ArchitectConfigurationError(ArchitectError):
    code = "organization_architect_unavailable"
    message = (
        "The Organization Architect requires the configured provider API key. "
        "Configure OPENAI_API_KEY or GEMINI_API_KEY and try again."
    )
    status_code = 503


class ArchitectProviderError(ArchitectError):
    code = "organization_architect_provider_error"
    message = "The Organization Architect is temporarily unavailable."
    status_code = 502


class ArchitectRateLimitError(ArchitectError):
    code = "organization_architect_rate_limited"
    message = "The Organization Architect is busy. Please try again shortly."
    status_code = 429


class ArchitectTimeoutError(ArchitectError):
    code = "organization_architect_timeout"
    message = "The Organization Architect took too long to respond."
    status_code = 504


class ArchitectValidationError(ArchitectError):
    code = "organization_architect_invalid_response"
    message = "The Organization Architect returned an invalid blueprint."
    status_code = 502


class ExecutionProviderError(Exception):
    """Expected failure while selecting or calling the configured execution provider."""

    code = "execution_provider_error"
    message = "Genesis could not execute the ready tasks with the configured provider."
    status_code = 502


class ExecutionProviderConfigurationError(ExecutionProviderError):
    code = "execution_provider_configuration_error"
    message = (
        "The selected provider is not configured. Set the applicable API key "
        "(OPENAI_API_KEY or GEMINI_API_KEY), or choose Mock AI."
    )
    status_code = 503


class ExecutionProviderUnavailableError(ExecutionProviderError):
    code = "execution_provider_unavailable"
    message = "The selected execution provider is temporarily unavailable."
    status_code = 502


class ProjectReviewError(Exception):
    """Expected failure while reviewing or selectively refining a generated project."""

    code = "project_review_error"
    message = "Genesis could not review the generated project."
    status_code = 502


class ProjectReviewConfigurationError(ProjectReviewError):
    code = "project_review_configuration_error"
    message = (
        "The configured project reviewer requires its provider API key. "
        "Use Mock AI or configure OPENAI_API_KEY or GEMINI_API_KEY."
    )
    status_code = 503


class ProjectReviewProviderUnavailableError(ProjectReviewError):
    code = "project_review_provider_unavailable"
    message = "The selected project review provider is temporarily unavailable."
    status_code = 502


class ProjectReviewValidationError(ProjectReviewError):
    code = "project_refinement_invalid_request"
    message = "The selected suggestions cannot be refined for the current project revision."
    status_code = 422
