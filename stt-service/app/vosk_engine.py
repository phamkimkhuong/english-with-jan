from __future__ import annotations

import io
import json
import threading
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class VoskEngineError(RuntimeError):
    """Raised when Vosk cannot load a model or transcribe audio."""


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


class VoskEngine:
    def __init__(self, model_path: Path) -> None:
        self._model_path = model_path
        self._model: Any | None = None
        self._model_lock = threading.Lock()

    def transcribe_wav(self, wav_bytes: bytes) -> SttResult:
        model = self._get_model()

        try:
            with wave.open(io.BytesIO(wav_bytes), "rb") as wav_file:
                sample_rate = wav_file.getframerate()
                recognizer = self._create_recognizer(model, sample_rate)

                while True:
                    data = wav_file.readframes(4000)
                    if not data:
                        break
                    recognizer.AcceptWaveform(data)

                raw_result = recognizer.FinalResult()
        except wave.Error as exc:
            raise VoskEngineError("input is not a valid WAV file") from exc

        parsed_result = json.loads(raw_result)
        words = [
            RecognizedWord(
                word=str(item.get("word", "")),
                start=float(item.get("start", 0)),
                end=float(item.get("end", 0)),
                conf=float(item.get("conf", 0)),
            )
            for item in parsed_result.get("result", [])
            if item.get("word")
        ]

        return SttResult(
            transcript=str(parsed_result.get("text", "")).strip(),
            words=words,
        )

    def _get_model(self) -> Any:
        if self._model is not None:
            return self._model

        with self._model_lock:
            if self._model is not None:
                return self._model

            if not self._model_path.exists():
                raise VoskEngineError(
                    f"Vosk model path does not exist: {self._model_path}"
                )

            try:
                from vosk import Model
            except ImportError as exc:
                raise VoskEngineError("vosk is not installed") from exc

            self._model = Model(str(self._model_path))
            return self._model

    @staticmethod
    def _create_recognizer(model: Any, sample_rate: int) -> Any:
        try:
            from vosk import KaldiRecognizer
        except ImportError as exc:
            raise VoskEngineError("vosk is not installed") from exc

        recognizer = KaldiRecognizer(model, sample_rate)
        recognizer.SetWords(True)
        return recognizer
