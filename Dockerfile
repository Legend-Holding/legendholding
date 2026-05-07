FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the client JS bundle during
# `next build`, so they MUST be present at build time. The workflow
# passes them as --build-arg.
ARG NEXT_PUBLIC_APP_STORE_URL
ARG NEXT_PUBLIC_PLAY_STORE_URL
ENV NEXT_PUBLIC_APP_STORE_URL=${NEXT_PUBLIC_APP_STORE_URL}
ENV NEXT_PUBLIC_PLAY_STORE_URL=${NEXT_PUBLIC_PLAY_STORE_URL}

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Also expose them at runtime so server-side reads in /get-app
# (which redirect() based on user-agent) resolve correctly.
ARG NEXT_PUBLIC_APP_STORE_URL
ARG NEXT_PUBLIC_PLAY_STORE_URL
ENV NEXT_PUBLIC_APP_STORE_URL=${NEXT_PUBLIC_APP_STORE_URL}
ENV NEXT_PUBLIC_PLAY_STORE_URL=${NEXT_PUBLIC_PLAY_STORE_URL}

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000
CMD ["npm", "run", "start"]
