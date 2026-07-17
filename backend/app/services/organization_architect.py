from app.schemas.architect import OrganizationBlueprint
from app.services.architect_parser import parse_organization_blueprint
from app.services.architect_prompt import ORGANIZATION_ARCHITECT_INSTRUCTIONS, build_architect_input
from app.services.openai_client import ResponsesClient


class OrganizationArchitectService:
    """Application service that produces a validated organization blueprint."""

    def __init__(self, client: ResponsesClient) -> None:
        self._client = client

    async def create_blueprint(self, mission: str) -> OrganizationBlueprint:
        raw_output = await self._client.create_json(
            input_text=build_architect_input(mission),
            instructions=ORGANIZATION_ARCHITECT_INSTRUCTIONS,
            schema=OrganizationBlueprint.model_json_schema(),
            schema_name="organization_blueprint",
        )
        return parse_organization_blueprint(raw_output)
