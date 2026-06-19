from __future__ import annotations

import io
import os
import shutil
import subprocess
import wave
from dataclasses import dataclass
from pathlib import Path


class AudioConversionError(RuntimeError):
    """Raised when ffmpeg cannot convert user audio to WAV."""


def _configured_ffmpeg_path() -> str | None:
    raw_path = os.getenv("STT_FFMPEG_PATH", "").strip()
    return raw_path or None


def get_ffmpeg_executable() -> str:
    configured_path = _configured_ffmpeg_path()
    if configured_path:
        return configured_path
    return shutil.which("ffmpeg") or "ffmpeg"


def is_ffmpeg_available() -> bool:
    configured_path = _configured_ffmpeg_path()
    if configured_path:
        return Path(configured_path).exists()
    return shutil.which("ffmpeg") is not None


@dataclass(frozen=True)
class ConvertedAudio:
    wav_bytes: bytes
    duration_ms: int
    sample_rate: int
    channels: int


def convert_to_wav_16k_mono(
    audio_bytes: bytes,
    *,
    max_audio_seconds: int,
    timeout_seconds: int,
) -> ConvertedAudio:
    command = [
        get_ffmpeg_executable(),
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        "pipe:0",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-f",
        "wav",
        "pipe:1",
    ]

    try:
        completed = subprocess.run(
            command,
            input=audio_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout_seconds,
            check=False,
        )
    except FileNotFoundError as exc:
        raise AudioConversionError("ffmpeg is not installed or is not in PATH") from exc
    except subprocess.TimeoutExpired as exc:
        raise AudioConversionError("audio conversion timed out") from exc

    if completed.returncode != 0:
        message = completed.stderr.decode("utf-8", errors="replace").strip()
        raise AudioConversionError(message or "audio conversion failed")

    wav_bytes = completed.stdout
    if not wav_bytes:
        raise AudioConversionError("audio conversion produced an empty file")

    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as wav_file:
            sample_rate = wav_file.getframerate()
            channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            pcm_bytes = wav_file.readframes(1_000_000_000)
    except wave.Error as exc:
        raise AudioConversionError("converted audio is not a valid WAV file") from exc

    if sample_rate != 16000 or channels != 1:
        raise AudioConversionError("converted audio must be 16 kHz mono WAV")

    bytes_per_frame = channels * sample_width
    frame_count = len(pcm_bytes) // bytes_per_frame if bytes_per_frame else 0
    duration_ms = int((frame_count / sample_rate) * 1000) if sample_rate else 0

    if duration_ms > max_audio_seconds * 1000:
        raise AudioConversionError(
            f"audio is too long; max duration is {max_audio_seconds} seconds"
        )

    return ConvertedAudio(
        wav_bytes=wav_bytes,
        duration_ms=duration_ms,
        sample_rate=sample_rate,
        channels=channels,
    )