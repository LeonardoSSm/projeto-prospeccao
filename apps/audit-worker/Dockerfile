# Imagem oficial do Playwright: já traz Chromium + todas as dependências de SO
# necessárias para rodá-lo headless. Evita misturar node_modules compilado em
# Alpine (musl) com o binário do navegador, que é específico de plataforma.
FROM mcr.microsoft.com/playwright:v1.49.1-noble AS base
WORKDIR /workspace
# corepack nesta imagem falha ao verificar a assinatura do pnpm "latest" (chave
# desatualizada); instalar via npm evita depender dessa verificação de rede.
RUN npm install -g pnpm@9.15.9

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/audit-worker/package.json apps/audit-worker/package.json
COPY apps/core-api/package.json apps/core-api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @prospector/audit-worker...
# Rede de segurança: a imagem base já traz o Chromium da mesma versão do
# Playwright na tag acima; isso só baixa algo se houver divergência.
RUN pnpm --filter @prospector/audit-worker exec playwright install --with-deps chromium

FROM deps AS build
COPY apps/audit-worker apps/audit-worker
RUN pnpm --filter @prospector/audit-worker run build

# Ver nota equivalente no Dockerfile do core-api sobre o store compartilhado do pnpm.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /workspace /workspace
CMD ["node", "apps/audit-worker/dist/index.js"]
