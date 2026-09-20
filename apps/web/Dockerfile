FROM node:22-alpine AS base
WORKDIR /workspace
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/core-api/package.json apps/core-api/package.json
COPY apps/audit-worker/package.json apps/audit-worker/package.json
RUN pnpm install --frozen-lockfile --filter @prospector/web...

FROM deps AS build
COPY apps/web apps/web
ARG VITE_API_BASE_URL=http://localhost:8080/api/v1
ARG VITE_OIDC_AUTHORITY=http://localhost:8081/realms/prospector
ARG VITE_OIDC_CLIENT_ID=prospector-web
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_OIDC_AUTHORITY=$VITE_OIDC_AUTHORITY
ENV VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID
RUN pnpm --filter @prospector/web run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
