from pydantic import BaseModel, ConfigDict


class Schema(BaseModel):
    """Base contract with a consistent strictness policy for API schemas."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
