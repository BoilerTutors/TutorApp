from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import Optional

_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    secret_key: SecretStr
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    stripe_secret_key: Optional[SecretStr] = None
    stripe_connect_refresh_url: Optional[str] = None
    stripe_connect_return_url: Optional[str] = None


settings = Settings()  # type: ignore[call-arg]