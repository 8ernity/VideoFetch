# ⚡ VideoFetch
<p align="center">
  <img src="./client/public/VideoFetch.png" alt="VideoFetch Banner" width="100%">
</p>

A modern, high-performance web application for downloading publicly accessible videos and audio from 1000+ supported platforms. Built with **React + Vite** (frontend) and **Node.js + Express** (backend), powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp) and **FFmpeg**.

---

## Features

- 🎬 **Video Metadata Extraction** — title, high-res thumbnail, duration, uploader, view count
- 📦 **Multi-Format & Resolution** — 4K, 1080p, 720p, 480p, 360p, and MP3 audio extraction
- ✂️ **Precise Video Trimming** — select custom start and end timestamps for partial section downloads
- ▶️ **Inline Video Preview** — preview videos directly inside the app before downloading
- 🎨 **Dynamic Multi-Accent Themes** — Cyber Cyan, Electric Purple, Sunset Orange, and Neon Lime
- ⬇️ **Download Progress Tracking** — real-time byte counter, speed calculator, and progress indicator
- 📋 **Clipboard Auto-Paste** — automatically detects video URLs copied to your clipboard
- 🗂️ **Download History** — local history tracking with thumbnail proxies and quick open links
- ❓ **Interactive Help & FAQ** — built-in step-by-step user guide and troubleshooting answers
- 🛡️ **DRM Platform Protection** — Netflix, Disney+, HBO Max, etc. are blocked
- 🚦 **Rate Limiting & Security** — rate-limited backend with Helmet security headers
- 📱 **Mobile-Friendly Design** — fully responsive slide-out navbar and glassmorphic layout
- 🌑 **Pitch Black Glassmorphic UI** — modern dark mode aesthetics with particle animations

---

## Prerequisites

- **Node.js** ≥ 18
- **yt-dlp** installed and available on PATH
  ```bash
  # Install or upgrade yt-dlp via pip
  pip install --upgrade yt-dlp
  # or on Windows via WinGet
  winget install yt-dlp
  ```
- **FFmpeg** installed and available on PATH

---

## 🏗️ System Architecture Diagram

```mermaid
flowchart LR
    %% Color Styling
    classDef client fill:#1e40af,stroke:#3b82f6,color:#fff;
    classDef middleware fill:#6b21a8,stroke:#a855f7,color:#fff;
    classDef decision fill:#b45309,stroke:#f59e0b,color:#fff;
    classDef engine fill:#0e7490,stroke:#06b6d4,color:#fff;
    classDef success fill:#047857,stroke:#10b981,color:#fff;
    classDef danger fill:#b91c1c,stroke:#ef4444,color:#fff;
    classDef storage fill:#4338ca,stroke:#6366f1,color:#fff;

    USER["🌐 Web Client<br/>(React + Vite)"]:::client
    CLIP["📋 Auto-Paste"]:::client
    HIST["🗂️ LocalStorage"]:::storage

    MIDDLEWARE["🛡️ Security & Rate Limiter"]:::middleware
    CHECK{"🚫 Allowed?"}:::decision
    REJECT["🔴 403 Blocked<br/>(DRM / Restricted)"]:::danger
    ROUTER["⚡ Express Router<br/>(/api/video)"]:::middleware

    DISPATCH{"🔍 Dispatcher"}:::decision

    CUSTOM["🔑 Custom Scraper<br/>(Token & Deobfuscation Engine)"]:::engine
    YTDLP["🐍 yt-dlp CLI Engine"]:::engine

    TRIM{"✂️ Trim?"}:::decision

    STREAM["🚀 Direct Stream"]:::engine
    PROXY["🎬 Range Proxy & FFmpeg"]:::engine

    OK["✅ 200 Delivered"]:::success

    %% Connections
    USER --> MIDDLEWARE
    CLIP --> USER
    HIST <--> USER

    MIDDLEWARE --> CHECK
    CHECK -->|Blocked| REJECT
    CHECK -->|Allowed| ROUTER

    ROUTER --> DISPATCH
    DISPATCH -->|Custom Extractors| CUSTOM
    DISPATCH -->|Generic / Public Sites| YTDLP

    CUSTOM --> TRIM
    YTDLP --> TRIM

    TRIM -->|Full Video| STREAM
    TRIM -->|Partial Range| PROXY

    STREAM --> OK
    PROXY --> OK
```

---

## 📁 Project Structure

```
videofetch/
├── api/                        # Vercel serverless deployment entry point
│   └── index.js
├── client/                     # React frontend (Vite)
│   ├── public/
│   │   ├── 8ernity_brand.png   # Sidebar bottom branding asset
│   │   ├── favicon.png         # Transparent app tab favicon
│   │   ├── logo.png            # App logo icon
│   │   └── VideoFetch.png      # Hero banner graphic
│   ├── src/
│   │   ├── components/
│   │   │   ├── Disclaimer.jsx
│   │   │   ├── DownloadHistory.jsx
│   │   │   ├── DownloadProgress.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── FormatSelector.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── Help.jsx
│   │   │   ├── ParticleBackground.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── SideNavBar.jsx
│   │   │   ├── URLInput.jsx
│   │   │   ├── VideoPreview.jsx
│   │   │   └── VideoTrimmer.jsx
│   │   ├── hooks/
│   │   │   ├── useAppSettings.js
│   │   │   ├── useClipboard.js
│   │   │   └── useDownloadHistory.js
│   │   ├── utils/
│   │   │   ├── api.js
│   │   │   ├── formatters.js
│   │   │   └── validators.js
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                     # Express backend
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── rateLimiter.js
│   │   │   └── validator.js
│   │   ├── routes/
│   │   │   └── video.js
│   │   ├── services/
│   │   │   └── ytdlp.js
│   │   ├── utils/
│   │   │   ├── blocklist.js
│   │   │   └── helpers.js
│   │   └── index.js
│   ├── .env.example
│   └── package.json
├── .gitignore
├── LICENSE.md
├── README.md
├── package.json
└── vercel.json
```

---

## 🚀 Quick Start

### 1. Clone and install dependencies

```bash
npm run install-all
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

### 3. Start development server

```bash
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to the backend at `http://localhost:3001`.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX` | `50` | Max requests per window |
| `YTDLP_PATH` | `yt-dlp` | Path to yt-dlp binary |

---

## 🌐 Deployment

### Fullstack → Render

1. Push code to your GitHub repository
2. Connect repository on [Render](https://render.com)
3. Set **Build Command**: `npm run build`
4. Set **Start Command**: `npm start`

---

## 🛡️ Security & Legal

- ⚠️ Only download content you have the rights to access
- 🛡️ DRM-protected platforms (Netflix, Disney+, HBO Max, etc.) are blocked
- 🚦 Rate limiting is enabled by default (50 req / 15 min)
- 🔒 Helmet security headers are applied
- No files are stored permanently on the server

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS v4 |
| Backend | Node.js, Express 4 |
| Video Engine | yt-dlp (CLI) + FFmpeg |
| Styling | Pitch black background, glassmorphism, dynamic multi-accent themes |
| State | React hooks + localStorage |

---

## 📜 License

This project is licensed under the [MIT License](LICENSE.md) — use responsibly.
