FROM node:22-bookworm-slim AS deps

WORKDIR /repo

ENV CI=true
ENV HUSKY=0
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable \
  && corepack prepare npm@11.8.0 --activate

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY scripts/patch-next-postcss.mjs ./scripts/patch-next-postcss.mjs
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN corepack npm ci \
  && corepack npm cache clean --force

FROM deps AS prod-deps

COPY apps/api/prisma ./apps/api/prisma

RUN corepack npm prune --omit=dev \
  && corepack npm --workspace @partner/api run prisma:generate \
  && corepack npm cache clean --force

FROM deps AS build

COPY . .

RUN test -f apps/api/scripts/start-dist.mjs
RUN npm run build --workspace @partner/api
RUN test -d apps/api/dist \
  && test -f apps/api/scripts/start-dist.mjs

FROM node:22-bookworm-slim AS runtime

WORKDIR /repo

ENV NODE_ENV=production
ENV PORT=4000
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --system appgroup \
  && adduser --system --ingroup appgroup --home /repo appuser

COPY --from=prod-deps --chown=appuser:appgroup /repo/package.json /repo/package-lock.json ./
COPY --from=prod-deps --chown=appuser:appgroup /repo/node_modules ./node_modules
COPY --from=prod-deps --chown=appuser:appgroup /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=appuser:appgroup /repo/apps/api/dist ./apps/api/dist
COPY --from=build --chown=appuser:appgroup /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=appuser:appgroup /repo/apps/api/scripts ./apps/api/scripts

RUN test -d /repo/apps/api/dist \
  && test -f /repo/apps/api/scripts/start-dist.mjs

USER appuser

EXPOSE 4000

CMD ["sh", "-lc", "npm --workspace @partner/api run prisma:migrate:deploy && exec npm --workspace @partner/api run start"]
