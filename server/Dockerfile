# Press Run server for Railway (or any host that runs a container).
# Bun runs the TypeScript directly; ffmpeg cuts the sample clips.
ARG BUN_VERSION=1.4.4
FROM oven/bun:${BUN_VERSION}-debian

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src ./src
COPY public ./public

# Local file storage only if R2 isn't set up (cards and clips need to survive restarts, so use R2 in production).
RUN mkdir -p /app/files && chown bun:bun /app/files

ENV NODE_ENV=production \
    PORT=3000
EXPOSE 3000
USER bun
CMD ["bun", "run", "src/index.ts"]
