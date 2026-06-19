from __future__ import annotations

import time

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
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
from app.vosk_engine import VoskEngine, VoskEngineError

settings = get_settings()
engine = VoskEngine(settings.model_path)
auth_verifier = FirebaseTokenVerifier(settings.firebase_project_id)
rate_limiter = RateLimiter(settings.rate_limit_per_minute)

app = FastAPI(title="English with Jan STT Service", version="0.1.0")

if settings.allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )


async def authenticate_request(request: Request) -> AuthenticatedUser | None:
    if not settings.auth_required:
        return None

    try:
        return auth_verifier.verify_authorization_header(request.headers.get("authorization"))
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
    return {
        "ok": True,
        "engine": "vosk",
        "modelPath": str(settings.model_path),
        "modelPathExists": settings.model_path.exists(),
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
    except VoskEngineError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    processing_ms = int((time.perf_counter() - started_at) * 1000)

    return {
        "engine": "vosk",
        "modelPath": str(settings.model_path),
        "transcript": result.transcript,
        "words": [word.__dict__ for word in result.words],
        "durationMs": converted_audio.duration_ms,
        "processingMs": processing_ms,
    }