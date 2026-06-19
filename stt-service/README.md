# STT Service Prototype

Self-hosted speech-to-text prototype for short pronunciation practice clips.

This service is intentionally separate from the Next.js app and Firebase
functions. It is designed to run locally first, then on a small VPS such as
Oracle Always Free.

## Scope

- Accept short audio uploads.
- Convert audio to 16 kHz mono PCM with `ffmpeg`.
- Transcribe with Vosk.
- Return transcript, word timings, confidence, and processing time.

This is not full pronunciation assessment yet. It is the first layer that
replaces unreliable mobile browser speech recognition.

## Requirements

- Python 3.10 or 3.11 recommended. Avoid Python 3.14 until Vosk wheels are confirmed.
- `ffmpeg` available in `PATH`.
- Vosk English model.

## Setup

```powershell
cd C:\doan\english-with-jan\stt-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

If `py -3.11` is not available locally, install Python 3.11 first or use a
VPS/Linux environment with Python 3.11.

Download a model into `stt-service\models`. Recommended first model:

```text
vosk-model-small-en-us-0.15
```

Model page:

```text
https://alphacephei.com/vosk/models
```

Or use the helper script:

```powershell
.\scripts\download-vosk-small-en-us.ps1
```

Expected folder:

```text
stt-service\models\vosk-model-small-en-us-0.15
```

## Run

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8010 --reload
```

Health check:

```powershell
curl.exe http://127.0.0.1:8010/health
```

Transcribe an audio file:

```powershell
curl.exe -X POST http://127.0.0.1:8010/v1/stt -F "audio=@sample.wav"
```

## API

### `GET /health`

Returns whether the service can see the configured Vosk model path.

### `POST /v1/stt`

Multipart form field:

```text
audio=<audio file>
```

Response:

```json
{
  "engine": "vosk",
  "modelPath": "./models/vosk-model-small-en-us-0.15",
  "transcript": "think",
  "words": [
    { "word": "think", "start": 0.12, "end": 0.64, "conf": 0.83 }
  ],
  "durationMs": 720,
  "processingMs": 310
}
```

## Notes

- Keep uploads short. The default limit is 5 MB and 8 seconds.
- Do not deploy this publicly without authentication and rate limiting.
- Later app integration should use Firebase Auth verification, not a public
  client API key.
## Troubleshooting

### `curl: (26) Failed to open/read local data from file/application`

This is a local `curl` error, not a server error. The file after `@` does not
exist or cannot be read from the current PowerShell directory.

Check first:

```powershell
Test-Path .\sample.wav
Get-ChildItem *.wav
```

Use a real file path:

```powershell
curl.exe -X POST http://127.0.0.1:8010/v1/stt -F "audio=@C:\path\to\your\recording.wav"
```

### `ffmpeg is not installed or is not in PATH`

The service starts without `ffmpeg`, but `/v1/stt` needs it to normalize browser
audio into 16 kHz mono WAV for Vosk. Install `ffmpeg`, then restart the terminal
and the `uvicorn` process.

Check:

```powershell
ffmpeg -version
curl.exe http://127.0.0.1:8010/health
```

The health response should include:

```json
{ "ffmpegAvailable": true }
```
## Production Auth

Local `.env` can use:

```text
STT_AUTH_REQUIRED=false
```

For Oracle/public HTTPS, use:

```text
STT_AUTH_REQUIRED=true
STT_FIREBASE_PROJECT_ID=<your Firebase project id>
STT_ALLOWED_ORIGINS=https://<your app domain>
```

When auth is enabled, `/v1/stt` requires:

```text
Authorization: Bearer <Firebase ID token>
```

The service verifies Firebase ID tokens with Google's public Firebase certs. It
does not use Google Speech-to-Text and does not require committing a service
account JSON file.

## Deploy

Oracle deployment templates live in:

```text
stt-service\deploy\oracle
```

Use them for the production env file, systemd service, and Caddy HTTPS reverse
proxy.
