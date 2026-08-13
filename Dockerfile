# ──────────────────────────────────────────────────────────────
# 🐳 VideoFetch — Production Dockerfile for Render / Railway
# Includes Node.js 20, Python3, yt-dlp, and FFmpeg
# ──────────────────────────────────────────────────────────────

FROM node:20-bookworm-slim

# Install system dependencies: Python3, FFmpeg, curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy root and subfolder package files first (cache optimization)
COPY package.json package-lock.json* ./
COPY client/package.json client/package-lock.json* ./client/
COPY server/package.json server/package-lock.json* ./server/

# Install dependencies for both client and server
RUN npm run install-all

# Copy full application source code
COPY . .

# Build the React frontend production bundle
RUN npm run build --prefix client

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start the Express server
CMD ["node", "server/src/index.js"]
