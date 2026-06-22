import logging
import requests
from app.whisper_engine import SttResult, RecognizedWord

logger = logging.getLogger("uvicorn.error")


class DeepgramEngineError(RuntimeError):
    """Raised when Deepgram transcription fails."""


class DeepgramEngine:
    def __init__(self, api_key: str | None) -> None:
        self._api_key = api_key

    def transcribe_wav(self, wav_bytes: bytes, keyterms: list[str] | None = None) -> SttResult:
        if not self._api_key:
            raise DeepgramEngineError("STT_DEEPGRAM_API_KEY is not configured")

        url = "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&words=true"
        headers = {
            "Authorization": f"Token {self._api_key}",
            "Content-Type": "audio/wav",
        }

        params = {}
        if keyterms:
            logger.info("Deepgram transcribing with keyterms: %s", keyterms)
            params["keyterm"] = keyterms

        try:
            response = requests.post(url, headers=headers, data=wav_bytes, params=params, timeout=8)
            if response.status_code == 402:
                raise DeepgramEngineError("Deepgram API credit exhausted (402 Payment Required)")
            response.raise_for_status()
            res_json = response.json()
        except requests.RequestException as exc:
            raise DeepgramEngineError(f"Deepgram API request failed: {exc}") from exc
        except ValueError as exc:
            raise DeepgramEngineError(f"Deepgram returned invalid JSON response: {exc}") from exc

        try:
            results = res_json.get("results", {})
            channels = results.get("channels", [])
            if not channels:
                return SttResult(transcript="", words=[])

            alternatives = channels[0].get("alternatives", [])
            if not alternatives:
                return SttResult(transcript="", words=[])

            alt = alternatives[0]
            transcript = alt.get("transcript", "").strip()
            words = []

            for w in alt.get("words", []):
                word_str = w.get("word", "").strip()
                if word_str:
                    words.append(
                        RecognizedWord(
                            word=word_str,
                            start=float(w.get("start", 0.0)),
                            end=float(w.get("end", 0.0)),
                            conf=float(w.get("confidence", 1.0)),
                        )
                    )

            return SttResult(transcript=transcript, words=words)
        except (KeyError, IndexError, TypeError) as exc:
            raise DeepgramEngineError(f"Failed to parse Deepgram response: {exc}") from exc
