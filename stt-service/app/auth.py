from __future__ import annotations

import re
import threading
import time
from dataclasses import dataclass
from typing import Any

import jwt
import requests
from cryptography.x509 import load_pem_x509_certificate

FIREBASE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)


class TokenVerificationError(RuntimeError):
    """Raised when a bearer token is missing or invalid."""


class TokenVerificationUnavailable(RuntimeError):
    """Raised when token verification cannot run due to config/network issues."""


@dataclass(frozen=True)
class AuthenticatedUser:
    uid: str
    email: str | None
    name: str | None
    claims: dict[str, Any]


class FirebaseTokenVerifier:
    def __init__(self, project_id: str | None) -> None:
        self._project_id = project_id
        self._certs: dict[str, str] = {}
        self._certs_expires_at = 0.0
        self._lock = threading.Lock()

    @property
    def is_configured(self) -> bool:
        return bool(self._project_id)

    def verify_authorization_header(self, authorization_header: str | None) -> AuthenticatedUser:
        if not self._project_id:
            raise TokenVerificationUnavailable("STT_FIREBASE_PROJECT_ID is not configured")

        token = self._extract_bearer_token(authorization_header)
        return self.verify_token(token)

    def verify_token(self, token: str) -> AuthenticatedUser:
        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as exc:
            raise TokenVerificationError("invalid authorization token") from exc

        if header.get("alg") != "RS256":
            raise TokenVerificationError("invalid authorization token algorithm")

        kid = header.get("kid")
        if not kid:
            raise TokenVerificationError("authorization token is missing key id")

        certs = self._get_certs()
        cert = certs.get(kid)
        if not cert:
            self._clear_certs_cache()
            cert = self._get_certs().get(kid)

        if not cert:
            raise TokenVerificationError("authorization token key is not recognized")

        issuer = f"https://securetoken.google.com/{self._project_id}"

        try:
            cert_obj = load_pem_x509_certificate(cert.encode("utf-8"))
            public_key = cert_obj.public_key()
        except Exception as exc:
            raise TokenVerificationError("failed to parse Firebase public certificate") from exc

        try:
            claims = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=self._project_id,
                issuer=issuer,
            )
        except jwt.ExpiredSignatureError as exc:
            raise TokenVerificationError("authorization token is expired") from exc
        except jwt.InvalidTokenError as exc:
            raise TokenVerificationError("invalid authorization token") from exc

        uid = str(claims.get("sub") or "")
        if not uid:
            raise TokenVerificationError("authorization token is missing subject")
        if len(uid) > 128:
            raise TokenVerificationError("authorization token subject is too long")

        return AuthenticatedUser(
            uid=uid,
            email=claims.get("email"),
            name=claims.get("name"),
            claims=claims,
        )

    def _extract_bearer_token(self, authorization_header: str | None) -> str:
        if not authorization_header:
            raise TokenVerificationError("missing authorization bearer token")

        parts = authorization_header.split(" ", 1)
        if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
            raise TokenVerificationError("invalid authorization header")

        return parts[1].strip()

    def _get_certs(self) -> dict[str, str]:
        now = time.time()
        if self._certs and now < self._certs_expires_at:
            return self._certs

        with self._lock:
            now = time.time()
            if self._certs and now < self._certs_expires_at:
                return self._certs

            try:
                response = requests.get(FIREBASE_CERTS_URL, timeout=5)
                response.raise_for_status()
            except requests.RequestException as exc:
                raise TokenVerificationUnavailable("cannot fetch Firebase public certs") from exc

            certs = response.json()
            if not isinstance(certs, dict):
                raise TokenVerificationUnavailable("Firebase public cert response is invalid")

            self._certs = {str(key): str(value) for key, value in certs.items()}
            self._certs_expires_at = now + self._read_max_age(response.headers.get("Cache-Control"))
            return self._certs

    def _clear_certs_cache(self) -> None:
        with self._lock:
            self._certs = {}
            self._certs_expires_at = 0.0

    @staticmethod
    def _read_max_age(cache_control: str | None) -> int:
        if not cache_control:
            return 3600

        match = re.search(r"max-age=(\d+)", cache_control)
        if not match:
            return 3600

        return max(60, int(match.group(1)))