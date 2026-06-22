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


def _read_model_path() -> str:
    raw_value = os.getenv("STT_MODEL_PATH", "base.en").strip()
    if "vosk" in raw_value.lower():
        return "base.en"
    return raw_value


def _read_download_root() -> Path:
    raw_value = os.getenv("STT_DOWNLOAD_ROOT", "./models")
    download_root = Path(raw_value)
    if download_root.is_absolute():
        return download_root
    return SERVICE_ROOT / download_root


@dataclass(frozen=True)
class Settings:
    model_path: str
    download_root: Path
    allowed_origins: list[str]
    max_audio_bytes: int
    max_audio_seconds: int
    ffmpeg_timeout_seconds: int
    auth_required: bool
    firebase_project_id: str | None
    rate_limit_per_minute: int
    whisper_beam_size: int
    whisper_vad_filter: bool
    stt_active_engine: str
    deepgram_api_key: str | None


def get_settings() -> Settings:
    active_engine = _read_optional_string("STT_ACTIVE_ENGINE") or "deepgram"
    return Settings(
        model_path=_read_model_path(),
        download_root=_read_download_root(),
        allowed_origins=_read_origins(),
        max_audio_bytes=_read_int("STT_MAX_AUDIO_BYTES", 5 * 1024 * 1024),
        max_audio_seconds=_read_int("STT_MAX_AUDIO_SECONDS", 18),
        ffmpeg_timeout_seconds=_read_int("STT_FFMPEG_TIMEOUT_SECONDS", 25),
        auth_required=_read_bool("STT_AUTH_REQUIRED", True),
        firebase_project_id=_read_optional_string("STT_FIREBASE_PROJECT_ID"),
        rate_limit_per_minute=_read_int("STT_RATE_LIMIT_PER_MINUTE", 30),
        whisper_beam_size=_read_int("STT_WHISPER_BEAM_SIZE", 5),
        whisper_vad_filter=_read_bool("STT_WHISPER_VAD_FILTER", True),
        stt_active_engine=active_engine.lower().strip(),
        deepgram_api_key=_read_optional_string("STT_DEEPGRAM_API_KEY"),
    )