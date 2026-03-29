from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

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

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: SecretStr = SecretStr("")
    smtp_from_email: str = ""
    mfa_code_expire_minutes: int = 10
    mfa_max_attempts: int = 3


settings = Settings()  # type: ignore[call-arg]