from __future__ import annotations

import time
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware

from app.audio import AudioConversionError, convert_to_wav_16k_mono, is_ffmpeg_available
from app.auth import (
    AuthenticatedUser,
    FirebaseTokenVerifier,
    TokenVerificationError,
    TokenVerificationUnavailable,
)
from app.config import get_settings
from app.rate_limit import RateLimiter
from app.whisper_engine import WhisperEngine, WhisperEngineError

settings = get_settings()
engine = WhisperEngine(settings.model_path, settings.download_root)
auth_verifier = FirebaseTokenVerifier(settings.firebase_project_id)
rate_limiter = RateLimiter(settings.rate_limit_per_minute)
security = HTTPBearer(auto_error=False)

app = FastAPI(title="English with Jan STT Service", version="0.1.0")

if settings.allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )


async def authenticate_request(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> AuthenticatedUser | None:
    if not settings.auth_required:
        return None

    token = None
    if credentials:
        token = credentials.credentials
    else:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header[7:]

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return auth_verifier.verify_token(token)
    except TokenVerificationUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except TokenVerificationError as exc:
        raise HTTPException(
            status_code=401,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def _rate_limit_key(request: Request, user: AuthenticatedUser | None) -> str:
    if user:
        return f"uid:{user.uid}"
    if request.client and request.client.host:
        return f"ip:{request.client.host}"
    return "ip:unknown"


def _enforce_rate_limit(request: Request, user: AuthenticatedUser | None) -> None:
    decision = rate_limiter.check(_rate_limit_key(request, user))
    if decision.allowed:
        return

    raise HTTPException(
        status_code=429,
        detail="rate limit exceeded",
        headers={"Retry-After": str(decision.retry_after_seconds)},
    )


@app.get("/health")
def health() -> dict[str, object]:
    model_name = settings.model_path
    download_root = settings.download_root
    model_exists = False
    if download_root.exists():
        expected_name = f"models--systran--faster-whisper-{model_name}".lower()
        for child in download_root.iterdir():
            if child.name.lower() == expected_name:
                model_exists = True
                break
    if not model_exists:
        model_exists = (download_root / model_name).exists() or Path(model_name).exists()
    return {
        "ok": True,
        "engine": "whisper",
        "modelPath": model_name,
        "modelPathExists": model_exists,
        "ffmpegAvailable": is_ffmpeg_available(),
        "authRequired": settings.auth_required,
        "authConfigured": (not settings.auth_required) or auth_verifier.is_configured,
        "rateLimitPerMinute": rate_limiter.requests_per_minute,
    }


@app.post("/v1/stt")
async def transcribe(
    request: Request,
    audio: UploadFile = File(...),
    user: AuthenticatedUser | None = Depends(authenticate_request),
) -> dict[str, object]:
    started_at = time.perf_counter()
    _enforce_rate_limit(request, user)

    audio_bytes = await audio.read()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="audio file is empty")

    if len(audio_bytes) > settings.max_audio_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"audio file is too large; max size is {settings.max_audio_bytes} bytes",
        )

    try:
        converted_audio = convert_to_wav_16k_mono(
            audio_bytes,
            max_audio_seconds=settings.max_audio_seconds,
            timeout_seconds=settings.ffmpeg_timeout_seconds,
        )
        result = engine.transcribe_wav(converted_audio.wav_bytes)
    except AudioConversionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except WhisperEngineError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    processing_ms = int((time.perf_counter() - started_at) * 1000)

    return {
        "engine": "whisper",
        "modelPath": settings.model_path,
        "transcript": result.transcript,
        "words": [word.__dict__ for word in result.words],
        "durationMs": converted_audio.duration_ms,
        "processingMs": processing_ms,
    }