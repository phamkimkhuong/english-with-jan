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

- Keep uploads short. The default limit is 5 MB and 18 seconds.
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

Use them for the production env file, systemd service, Caddy HTTPS reverse
proxy, and incremental zip-based deployment.

Package a release zip from Windows:

```powershell
cd C:\doan\english-with-jan
.\stt-service\scripts\package-stt-service.ps1
```

Upload the generated zip to:

```text
/home/ubuntu/english-with-jan-stt-service.zip
```

Then deploy on the VPS:

```bash
sudo update-english-with-jan-stt
```

The updater preserves `.env`, `.venv`, `models`, and previous code backups.
See `deploy/oracle/README.md` for first-time updater installation and rollback.

## DevOps & CI/CD Notes (Cập nhật tháng 06/2026)

Để vận hành hệ thống ổn định lâu dài và phòng ngừa các sự cố thực tế, chúng ta đã thiết lập quy trình tự động hóa CI/CD thông qua **GitHub Actions** với các cơ chế phòng ngừa lỗi sau:

### 1. Phân Tách 4 Lớp Dữ Liệu
Quy trình deploy qua Git ([update-from-git.sh](file:///c:/doan/english-with-jan/stt-service/deploy/oracle/update-from-git.sh)) hoặc Zip ([update-from-zip.sh](file:///c:/doan/english-with-jan/stt-service/deploy/oracle/update-from-zip.sh)) được cấu hình bằng `rsync --exclude` để **bảo vệ tuyệt đối** 3 thành phần không bao giờ bị xóa:
- Cấu hình môi trường (`.env`).
- Môi trường ảo chứa thư viện (`.venv`).
- Thư mục chứa các model nhận diện Vosk nặng hàng trăm MB (`models/`).

### 2. Tự Động Hóa CI/CD (GitHub Actions)
- File cấu hình: `.github/workflows/deploy-stt.yml`.
- Tự động SSH vào VPS và chạy lệnh cập nhật nguồn khi có thay đổi trong thư mục `stt-service` được push lên nhánh `main`.
- Đã được tích hợp cấu hình `set -e` và `script_stop: true` để tránh tình trạng "báo xanh thành công giả" (false-positive) khi lệnh deploy thực tế bị lỗi giữa chừng.

### 3. Phòng Ngừa & Xử Lý Sự Cố (Rollback)
- **Tự động Rollback (Auto-rollback)**: Khi deploy bản mới, script sẽ tự động tạo file backup nén dạng `code-*.tar.gz` trong thư mục `releases/` (giữ tối đa 5 bản). Sau khi khởi động lại dịch vụ, script sẽ liên tục gọi thử API `/health` nội bộ trong 20 giây. Nếu app bị sập (lỗi cú pháp, thiếu/xung đột thư viện trong `.venv`), script sẽ tự động khôi phục bản cũ và restart dịch vụ.
- **Rollback Thủ Công (Manual rollback)**: Nếu deploy thành công về mặt kỹ thuật nhưng phát hiện lỗi logic nghiệp vụ khi chạy thực tế, bạn chỉ cần SSH vào VPS và chạy lệnh nhanh:
  ```bash
  sudo rollback-english-with-jan-stt
  ```
  Hệ thống sẽ ngay lập tức khôi phục về bản backup gần nhất chỉ trong 2 giây.

### 4. Xử Lý Khi Xung Đột Thư Viện (.venv)
- Nếu môi trường ảo của bạn bị rối loạn sau nhiều lần cập nhật, chỉ cần SSH vào VPS và chạy:
  ```bash
  sudo rm -rf /opt/english-with-jan-stt/.venv
  ```
  Lần deploy tiếp theo từ GitHub Actions sẽ phát hiện thiếu `.venv` và tự động khởi tạo lại một môi trường sạch hoàn toàn từ đầu.

