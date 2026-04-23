from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class SecretCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    value: str = Field(..., min_length=1, max_length=4000)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Secret name is required")
        if not all(c.isalnum() or c in "_-" for c in normalized):
            raise ValueError("Secret name can only contain alphanumeric characters, hyphens, and underscores")
        return normalized


class SecretOut(BaseModel):
    id: int
    name: str
    masked_value: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SecretListOut(BaseModel):
    secrets: list[SecretOut]
    total: int
