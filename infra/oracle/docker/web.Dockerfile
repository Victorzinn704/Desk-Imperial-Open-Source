FROM node:22-bookworm-slim AS deps

WORKDIR /repo

ENV CI=true
ENV HUSKY=0
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable \
  && corepack prepare npm@11.8.0 --activate

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY scripts/patch-next-postcss.mjs ./scripts/patch-next-postcss.mjs
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN corepack npm ci \
  && corepack npm cache clean --force

RUN set -eux; \
  oxide_version="$(node -p "require('./node_modules/@tailwindcss/oxide/package.json').version")"; \
  arch="$(node -p "process.arch")"; \
  libc="gnu"; \
  if [ -e /lib/ld-musl-x86_64.so.1 ] || [ -e /lib/ld-musl-aarch64.so.1 ] || [ -e /lib/ld-musl-arm64.so.1 ]; then \
    libc="musl"; \
  fi; \
  oxide_pkg="@tailwindcss/oxide-linux-${arch}-${libc}"; \
  if [ ! -d "node_modules/${oxide_pkg}" ]; then \
    corepack npm install --no-save --no-package-lock --legacy-peer-deps "${oxide_pkg}@${oxide_version}"; \
  fi; \
  test -d "node_modules/${oxide_pkg}" \
  && node -e "require('@tailwindcss/oxide')"

FROM deps AS prod-deps

RUN corepack npm prune --omit=dev \
  && corepack npm cache clean --force \
  && mkdir -p apps/web/node_modules \
  && ln -sfn /repo/node_modules/next apps/web/node_modules/next \
  && test -L apps/web/node_modules/next

FROM deps AS build

ARG APP_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MAP_STYLE_URL

ENV APP_URL=${APP_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_MAP_STYLE_URL=${NEXT_PUBLIC_MAP_STYLE_URL}

COPY . .

RUN mkdir -p apps/web/node_modules \
  && ln -sfn /repo/node_modules/next apps/web/node_modules/next \
  && test -L apps/web/node_modules/next
RUN test -f apps/web/scripts/start.mjs
RUN npm run build --workspace @partner/web
RUN test -d apps/web/.next \
  && test -f apps/web/scripts/start.mjs

FROM node:22-bookworm-slim AS runtime

WORKDIR /repo

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --system appgroup \
  && adduser --system --ingroup appgroup --home /repo appuser

COPY --from=prod-deps --chown=appuser:appgroup /repo/package.json /repo/package-lock.json ./
COPY --from=prod-deps --chown=appuser:appgroup /repo/node_modules ./node_modules
COPY --from=prod-deps --chown=appuser:appgroup /repo/apps/web/package.json ./apps/web/package.json
COPY --from=prod-deps --chown=appuser:appgroup /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=build --chown=appuser:appgroup /repo/apps/web/.next ./apps/web/.next
COPY --from=build --chown=appuser:appgroup /repo/apps/web/public ./apps/web/public
COPY --from=build --chown=appuser:appgroup /repo/apps/web/scripts ./apps/web/scripts
COPY --from=build --chown=appuser:appgroup /repo/apps/web/next.config.ts ./apps/web/next.config.ts

RUN test -d /repo/apps/web/.next \
  && test -f /repo/apps/web/scripts/start.mjs \
  && test -L /repo/apps/web/node_modules/next

USER appuser

EXPOSE 3000

CMD ["sh", "-lc", "exec npm --workspace @partner/web run start"]
