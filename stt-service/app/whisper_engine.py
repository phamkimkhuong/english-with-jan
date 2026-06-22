from __future__ import annotations

import io
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class WhisperEngineError(RuntimeError):
    """Raised when Whisper cannot load a model or transcribe audio."""


@dataclass(frozen=True)
class RecognizedWord:
    word: str
    start: float
    end: float
    conf: float


@dataclass(frozen=True)
class SttResult:
    transcript: str
    words: list[RecognizedWord]


class WhisperEngine:
    def __init__(
        self,
        model_path_or_size: str | Path,
        download_root: Path | None = None,
        beam_size: int = 5,
        vad_filter: bool = False,
    ) -> None:
        self._model_path_or_size = model_path_or_size
        self._download_root = download_root
        self._beam_size = beam_size
        self._vad_filter = vad_filter
        self._model: Any | None = None
        self._model_lock = threading.Lock()

    def transcribe_wav(self, wav_bytes: bytes) -> SttResult:
        model = self._get_model()

        try:
            audio_file = io.BytesIO(wav_bytes)
            # Transcribe with word-level timestamps
            segments, info = model.transcribe(
                audio_file,
                word_timestamps=True,
                beam_size=self._beam_size,
                vad_filter=self._vad_filter,
            )
            # Iterate through the generator to execute transcription
            segments_list = list(segments)
        except Exception as exc:
            raise WhisperEngineError(f"Whisper transcription failed: {exc}") from exc

        words = []
        transcript_parts = []
        for segment in segments_list:
            transcript_parts.append(segment.text)
            if segment.words:
                for w in segment.words:
                    word_str = w.word.strip()
                    if word_str:
                        words.append(
                            RecognizedWord(
                                word=word_str,
                                start=float(w.start),
                                end=float(w.end),
                                conf=float(w.probability),
                            )
                        )

        transcript = "".join(transcript_parts).strip()
        return SttResult(
            transcript=transcript,
            words=words,
        )

    def _get_model(self) -> Any:
        if self._model is not None:
            return self._model

        with self._model_lock:
            if self._model is not None:
                return self._model

            try:
                from faster_whisper import WhisperModel
            except ImportError as exc:
                raise WhisperEngineError("faster-whisper is not installed") from exc

            try:
                model_str = str(self._model_path_or_size)
                download_root_str = str(self._download_root) if self._download_root else None
                
                # Check if it's a directory path or model name
                # If the path exists locally, load it directly
                # Otherwise, download/load from download_root
                self._model = WhisperModel(
                    model_str,
                    device="cpu",
                    compute_type="int8",
                    download_root=download_root_str,
                )
            except Exception as exc:
                raise WhisperEngineError(f"Failed to load Whisper model: {exc}") from exc

            return self._model
