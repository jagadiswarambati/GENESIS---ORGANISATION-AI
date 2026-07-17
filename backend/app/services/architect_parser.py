import json

from pydantic import ValidationError

from app.core.errors import ArchitectValidationError
from app.schemas.architect import OrganizationBlueprint


def parse_organization_blueprint(raw_output: str) -> OrganizationBlueprint:
    """Parse and validate a model response before it is allowed across the API boundary."""

    try:
        payload = json.loads(raw_output)
        return OrganizationBlueprint.model_validate(payload)
    except (json.JSONDecodeError, ValidationError) as error:
        raise ArchitectValidationError from error
