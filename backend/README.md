# OmniUtility Backend — yt-dlp Service

This is the video download backend for OmniUtility Suite.
It runs **yt-dlp + FFmpeg inside Docker** and exposes a REST API to the React frontend.

---

## ⚡ Prerequisites

You only need **Docker Desktop** installed.
Everything else (Python, yt-dlp, FFmpeg, Node.js) is bundled inside the container.

### Install Docker Desktop (Windows)

1. Go to: **https://www.docker.com/products/docker-desktop/**
2. Download and install **Docker Desktop for Windows**
3. Restart your machine after installation
4. Open Docker Desktop and wait for it to say **"Engine running"** in the taskbar

> You need Docker Desktop version **24+** for `docker compose` (v2) support.

---

## 🚀 Start the Backend

From the **project root** (`d:\Test App Modifications\New test apps\Utility`):

```powershell
# Build the Docker image (first time — takes ~3 minutes to download dependencies)
docker compose build

# Start the backend in the background
docker compose up -d

# Check that it's running
docker compose logs -f backend
```

You should see:
```
╔══════════════════════════════════════════════════╗
║       OmniUtility Backend — yt-dlp Service       ║
╠══════════════════════════════════════════════════╣
║  Listening on  : http://0.0.0.0:3001              ║
╚══════════════════════════════════════════════════╝
```

### Verify the backend is working

```powershell
# Health check
curl http://localhost:3001/health

# Should return:
# {"status":"ok","service":"omniutility-backend","uptime":5}

# Check yt-dlp and FFmpeg versions
curl http://localhost:3001/api/status
```

---

## 🌐 API Endpoints

### `POST /api/video/info`
Fetches metadata for a video URL.

```json
// Request body:
{ "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }

// Response:
{
  "success": true,
  "data": {
    "title": "Never Gonna Give You Up",
    "uploader": "Rick Astley",
    "thumbnail": "https://...",
    "duration": 212,
    "durationStr": "3:32",
    "viewCount": 1500000000,
    "availableFormats": [
      { "id": "1080", "height": 1080, "hasVideo": true },
      { "id": "720",  "height": 720,  "hasVideo": true },
      { "id": "mp3",  "height": 0,    "hasVideo": false },
      { "id": "m4a",  "height": 0,    "hasVideo": false }
    ]
  }
}
```

### `GET /api/video/download?url=<encoded_url>&format=<id>`
Streams the video/audio file directly to the browser.

| Format | Output        | Notes                          |
|--------|--------------|--------------------------------|
| `4k`   | MP4 (2160p)  | May not exist on all videos    |
| `2k`   | MP4 (1440p)  | May not exist on all videos    |
| `1080` | MP4 (1080p)  | Most common                    |
| `720`  | MP4 (720p)   | Most common                    |
| `480`  | MP4 (480p)   | —                              |
| `360`  | MP4 (360p)   | —                              |
| `mp3`  | MP3 (320kbps)| Transcoded via FFmpeg          |
| `m4a`  | M4A (AAC)    | Direct audio stream            |

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and edit values:

```powershell
Copy-Item backend\.env.example backend\.env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend port |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS whitelist (comma-separated) |
| `YOUTUBE_ONLY` | `false` | Set `true` to block non-YouTube URLs |
| `RATE_LIMIT_MAX_REQUESTS` | `20` | Max requests per minute per IP |
| `API_KEY` | *(empty)* | Optional bearer token guard |

---

## 🛑 Stop the Backend

```powershell
docker compose down
```

## 🔄 Update yt-dlp (when YouTube breaks)

yt-dlp updates frequently to stay ahead of YouTube changes.
To update inside the container without rebuilding:

```powershell
docker compose exec backend pip3 install --upgrade yt-dlp --break-system-packages
```

Or rebuild the full image (gets the latest version):

```powershell
docker compose build --no-cache
docker compose up -d
```

---

## 🗂️ File Structure

```
backend/
├── Dockerfile               # Node 20 + Python + yt-dlp + FFmpeg
├── .env.example             # Environment variable template
├── .dockerignore
├── package.json
└── src/
    ├── server.js            # Express app
    ├── routes/
    │   └── video.js         # POST /info, GET /download, GET /formats
    ├── middleware/
    │   └── rateLimit.js     # Rate limiting + API key guard
    └── utils/
        └── ytdlp.js         # yt-dlp wrapper (info + streaming download)
```
