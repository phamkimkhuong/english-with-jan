from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

SERVICE_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(SERVICE_ROOT / ".env")


def _read_int(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if not raw_value:
        return default

    try:
        return int(raw_value)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc


def _read_bool(name: str, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None or raw_value.strip() == "":
        return default

    normalized_value = raw_value.strip().lower()
    if normalized_value in {"1", "true", "yes", "on"}:
        return True
    if normalized_value in {"0", "false", "no", "off"}:
        return False

    raise ValueError(f"{name} must be a boolean")


def _read_optional_string(name: str) -> str | None:
    raw_value = os.getenv(name, "").strip()
    return raw_value or None


def _read_origins() -> list[str]:
    raw_value = os.getenv("STT_ALLOWED_ORIGINS", "")
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


def _read_model_path() -> Path:
    raw_value = os.getenv("STT_MODEL_PATH", "./models/vosk-model-small-en-us-0.15")
    model_path = Path(raw_value)
    if model_path.is_absolute():
        return model_path
    return SERVICE_ROOT / model_path


@dataclass(frozen=True)
class Settings:
    model_path: Path
    allowed_origins: list[str]
    max_audio_bytes: int
    max_audio_seconds: int
    ffmpeg_timeout_seconds: int
    auth_required: bool
    firebase_project_id: str | None
    rate_limit_per_minute: int


def get_settings() -> Settings:
    return Settings(
        model_path=_read_model_path(),
        allowed_origins=_read_origins(),
        max_audio_bytes=_read_int("STT_MAX_AUDIO_BYTES", 5 * 1024 * 1024),
        max_audio_seconds=_read_int("STT_MAX_AUDIO_SECONDS", 8),
        ffmpeg_timeout_seconds=_read_int("STT_FFMPEG_TIMEOUT_SECONDS", 15),
        auth_required=_read_bool("STT_AUTH_REQUIRED", True),
        firebase_project_id=_read_optional_string("STT_FIREBASE_PROJECT_ID"),
        rate_limit_per_minute=_read_int("STT_RATE_LIMIT_PER_MINUTE", 30),
    )