FROM node:22-alpine AS base
WORKDIR /workspace
# Prisma precisa do OpenSSL presente para detectar a versão certa do engine no Alpine (musl).
RUN apk add --no-cache openssl
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/core-api/package.json apps/core-api/package.json
COPY apps/audit-worker/package.json apps/audit-worker/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @prospector/core-api...

FROM deps AS build
COPY apps/core-api apps/core-api
RUN pnpm --filter @prospector/core-api run prisma:generate
RUN pnpm --filter @prospector/core-api run build

# pnpm liga os pacotes de cada app a um store compartilhado em /workspace/node_modules;
# por isso a imagem final copia o /workspace inteiro do estágio de build, não só
# apps/core-api/node_modules — copiar só o subdiretório quebraria os symlinks do store.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /workspace /workspace
EXPOSE 8080
CMD ["node", "apps/core-api/dist/main.js"]
