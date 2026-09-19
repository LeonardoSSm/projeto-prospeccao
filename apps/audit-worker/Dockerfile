FROM node:22-alpine AS base
WORKDIR /workspace
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/audit-worker/package.json apps/audit-worker/package.json
COPY apps/core-api/package.json apps/core-api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @prospector/audit-worker...

FROM deps AS build
COPY apps/audit-worker apps/audit-worker
RUN pnpm --filter @prospector/audit-worker run build

# Ver nota equivalente no Dockerfile do core-api sobre o store compartilhado do pnpm.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /workspace /workspace
CMD ["node", "apps/audit-worker/dist/index.js"]
