# ── Stage 1: Install Node.js dependencies ─────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# ── Stage 2: Final runtime image ───────────────────────────────────────────────
FROM node:20-slim

LABEL maintainer="OmniUtility Suite"
LABEL description="yt-dlp + FFmpeg backend — Fly.io optimized"

# ── System packages: Python, pip, FFmpeg ─────────────────────────────────────
# Install in a single RUN to minimize layers; clean up apt lists after
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# ── yt-dlp with curl-cffi (TLS impersonation for datacenter IP anti-bot bypass) ────
RUN pip3 install --no-cache-dir --upgrade "yt-dlp[default,curl-cffi]" --break-system-packages

# ── Verify all binaries ───────────────────────────────────────────────────────
RUN echo "=== Versions ===" \
    && node --version \
    && python3 --version \
    && yt-dlp --version \
    && ffmpeg -version 2>&1 | head -1

# ── App setup ─────────────────────────────────────────────────────────────────
WORKDIR /app

# Copy pre-built node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY src/ ./src/
COPY package.json ./
COPY cookies* ./

# ── Runtime directories ───────────────────────────────────────────────────────
RUN mkdir -p /tmp/ytdlp-scratch && chmod 777 /tmp/ytdlp-scratch

# ── Run as non-root for security ──────────────────────────────────────────────
# Note: yt-dlp needs to write cache — use node user's home
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "src/server.js"]
