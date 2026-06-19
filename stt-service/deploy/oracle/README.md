# Oracle Always Free Deploy Notes

This deploy path keeps the STT service separate from Firebase Functions and does
not use Google Speech-to-Text, Azure, or any paid speech API.

## Target Shape

```text
Mobile browser
-> https://stt.example.com/v1/stt
-> Caddy HTTPS reverse proxy
-> FastAPI on 127.0.0.1:8010
-> ffmpeg
-> Vosk small en-us model
```

Use a normal Always Free VM. Do not add a paid load balancer or paid managed
database for this prototype.

## Server Setup

On Ubuntu ARM64:

```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip ffmpeg unzip curl
sudo useradd --system --create-home --shell /usr/sbin/nologin stt
sudo mkdir -p /opt/english-with-jan-stt
sudo chown -R stt:stt /opt/english-with-jan-stt
```

Copy this `stt-service` folder to `/opt/english-with-jan-stt`.

```bash
cd /opt/english-with-jan-stt
sudo -u stt python3.11 -m venv .venv
sudo -u stt ./.venv/bin/python -m pip install --upgrade pip
sudo -u stt ./.venv/bin/python -m pip install -r requirements.txt
```

Download the Vosk model:

```bash
cd /opt/english-with-jan-stt
sudo -u stt mkdir -p models
curl -L -o /tmp/vosk-model-small-en-us-0.15.zip https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
sudo -u stt unzip /tmp/vosk-model-small-en-us-0.15.zip -d models
rm /tmp/vosk-model-small-en-us-0.15.zip
```

## Environment

Copy `deploy/oracle/stt.env.example` to `/opt/english-with-jan-stt/.env` and edit:

```bash
sudo cp deploy/oracle/stt.env.example /opt/english-with-jan-stt/.env
sudo nano /opt/english-with-jan-stt/.env
sudo chown stt:stt /opt/english-with-jan-stt/.env
sudo chmod 600 /opt/english-with-jan-stt/.env
```

Important production values:

```text
STT_AUTH_REQUIRED=true
STT_FIREBASE_PROJECT_ID=<your Firebase project id>
STT_ALLOWED_ORIGINS=https://<your app domain>
STT_FFMPEG_PATH=/usr/bin/ffmpeg
```

Token verification uses Firebase public certs and your project id. It does not
call Google Speech-to-Text and does not require a Firebase service account file.

## systemd

```bash
sudo cp deploy/oracle/stt-service.service /etc/systemd/system/stt-service.service
sudo systemctl daemon-reload
sudo systemctl enable stt-service
sudo systemctl start stt-service
sudo systemctl status stt-service
```

Local VM check:

```bash
curl http://127.0.0.1:8010/health
```

Expected production health shape:

```json
{
  "modelPathExists": true,
  "ffmpegAvailable": true,
  "authRequired": true,
  "authConfigured": true
}
```

## HTTPS Reverse Proxy

Install Caddy or use your preferred reverse proxy. With Caddy, copy the example
and replace `stt.example.com` with your real domain:

```bash
sudo cp deploy/oracle/Caddyfile.example /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Open ports 80 and 443 in both:

- Oracle VCN security rules
- Ubuntu firewall, if enabled

Do not expose port 8010 publicly. Keep FastAPI bound to `127.0.0.1`.

## Authenticated Test

From the frontend, Firebase Auth will provide the ID token:

```ts
const token = await user.getIdToken();
```

Then call:

```bash
curl -X POST https://stt.example.com/v1/stt \
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \
  -F "audio=@sample.webm"
```

## Operational Limits

Default service limits:

```text
Max audio size: 5 MB
Max audio duration: 8 seconds
Rate limit: 30 requests/user/minute
```

These are deliberately conservative for a free VPS. Raise them only after real
mobile testing.