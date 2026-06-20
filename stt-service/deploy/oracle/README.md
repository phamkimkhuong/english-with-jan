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
sudo apt install -y python3 python3-venv python3-pip ffmpeg unzip curl caddy rsync
sudo useradd --system --create-home --shell /usr/sbin/nologin stt
sudo mkdir -p /opt/english-with-jan-stt
sudo chown -R stt:stt /opt/english-with-jan-stt
```

Copy this `stt-service` folder to `/opt/english-with-jan-stt`.

```bash
cd /opt/english-with-jan-stt
sudo -u stt python3 -m venv .venv
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

## Routine Code Updates

The production update flow is incremental. It preserves these server-local assets:

```text
/opt/english-with-jan-stt/.env
/opt/english-with-jan-stt/.venv
/opt/english-with-jan-stt/models
/opt/english-with-jan-stt/releases
```

On the Windows development machine, package a clean release zip:

```powershell
cd C:\doan\english-with-jan
.\stt-service\scripts\package-stt-service.ps1
```

Upload the generated file to the VPS:

```text
C:\tmp\english-with-jan-stt-service.zip
-> /home/ubuntu/english-with-jan-stt-service.zip
```

Bootstrap the deploy command once on the VPS from the uploaded zip:

```bash
unzip -p /home/ubuntu/english-with-jan-stt-service.zip deploy/oracle/update-from-zip.sh | sudo tee /usr/local/bin/update-english-with-jan-stt >/dev/null
sudo chmod +x /usr/local/bin/update-english-with-jan-stt
```

Deploy the uploaded release:

```bash
sudo update-english-with-jan-stt /home/ubuntu/english-with-jan-stt-service.zip
```

During the first successful deploy, the script replaces this temporary command with symlinks to the managed scripts under `/opt/english-with-jan-stt/deploy/oracle`. After that, future updates are only:

```powershell
.\stt-service\scripts\package-stt-service.ps1
```

Then upload the zip and run:

```bash
sudo update-english-with-jan-stt
```

The deploy script creates a code backup, syncs the new release, installs Python
packages only when `requirements.txt` changes, restarts `stt-service`, and checks
`http://127.0.0.1:8010/health`. If the health check fails, it attempts to restore
the backup automatically.

Manual rollback to the latest backup:

```bash
sudo rollback-english-with-jan-stt
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
Max audio duration: 18 seconds
Rate limit: 30 requests/user/minute
```

These are deliberately conservative for a free VPS. Raise them only after real
mobile testing.