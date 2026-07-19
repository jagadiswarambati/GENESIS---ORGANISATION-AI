import json

from pydantic import ValidationError

from app.core.errors import ArchitectValidationError
from app.schemas.architect import OrganizationBlueprint


def parse_organization_blueprint(raw_output: str) -> OrganizationBlueprint:
    """Parse and validate a model response before it is allowed across the API boundary."""

    try:
        payload = json.loads(raw_output)
    except (json.JSONDecodeError, ValidationError) as error:
        raise ArchitectValidationError from error

    return validate_organization_blueprint(payload)


def validate_organization_blueprint(payload: object) -> OrganizationBlueprint:
    """Validate a decoded Organization Architect payload with the canonical Pydantic model."""

    try:
        return OrganizationBlueprint.model_validate(payload)
    except ValidationError as error:
        raise ArchitectValidationError from error
