from __future__ import annotations

import math
import threading
import time
from dataclasses import dataclass


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int


class RateLimiter:
    def __init__(self, requests_per_minute: int) -> None:
        self._requests_per_minute = requests_per_minute
        self._hits_by_key: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    @property
    def requests_per_minute(self) -> int:
        return self._requests_per_minute

    def check(self, key: str) -> RateLimitDecision:
        if self._requests_per_minute <= 0:
            return RateLimitDecision(allowed=True, retry_after_seconds=0)

        now = time.monotonic()
        window_start = now - 60

        with self._lock:
            hits = [hit for hit in self._hits_by_key.get(key, []) if hit > window_start]

            if len(hits) >= self._requests_per_minute:
                retry_after = max(1, math.ceil(60 - (now - hits[0])))
                self._hits_by_key[key] = hits
                return RateLimitDecision(allowed=False, retry_after_seconds=retry_after)

            hits.append(now)
            self._hits_by_key[key] = hits
            self._cleanup(window_start)
            return RateLimitDecision(allowed=True, retry_after_seconds=0)

    def _cleanup(self, window_start: float) -> None:
        empty_keys = [
            key
            for key, hits in self._hits_by_key.items()
            if not any(hit > window_start for hit in hits)
        ]
        for key in empty_keys:
            self._hits_by_key.pop(key, None)