"""Shared structured-output schemas for project-review providers."""

REFINED_ARTIFACT_SCHEMA = {
    "type": "object",
    "properties": {"content": {"type": "string"}},
    "required": ["content"],
    "additionalProperties": False,
}
