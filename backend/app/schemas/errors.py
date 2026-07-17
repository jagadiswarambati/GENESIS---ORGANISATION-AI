from app.schemas.base import Schema


class ApiError(Schema):
    """Stable error payload returned for known API failures."""

    code: str
    message: str
