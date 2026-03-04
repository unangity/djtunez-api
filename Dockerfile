# --- Stage 1: compile TypeScript ---------------------------------------------
FROM node:22-slim AS builder
WORKDIR /build

# Install all deps first (including devDeps needed by tsc)
COPY src/package*.json ./
RUN npm ci

# Copy source and compile
COPY src/ ./
RUN npm run build

# --- Stage 2: production-only node_modules -----------------------------------
FROM node:22-slim AS deps
WORKDIR /deps
COPY src/package*.json ./
RUN npm ci --omit=dev

# --- Stage 3: distroless runtime (no shell, no package manager) --------------
FROM gcr.io/distroless/nodejs22-debian12
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /deps/node_modules ./node_modules
COPY --from=builder /build/dist ./dist

EXPOSE 8080

# distroless sets ENTRYPOINT ["/nodejs/bin/node"]; CMD passes the entry file
CMD ["dist/app.js"]
