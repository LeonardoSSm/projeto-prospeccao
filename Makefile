.PHONY: up down logs ps migrate seed verify contract-test compose-test

up:
	# -V renova volumes anônimos (node_modules dos serviços em modo dev) — sem isso,
	# o Compose reaproveita o volume antigo entre recriações e um `pnpm add` novo
	# fica invisível dentro do container mesmo após rebuild da imagem.
	docker compose --env-file .env.local up -d --build -V

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

migrate:
	docker compose run --rm core-api-migrate

# Idempotente (docs/DOCUMENTATION.md seção 6.5) — sem isto, não existe organização
# de desenvolvimento e toda escrita falha por violação de FK (organization_id).
seed:
	docker compose exec core-api sh -c "cd apps/core-api && corepack pnpm run prisma:seed"

verify:
	docker compose exec core-api pnpm lint
	docker compose exec core-api pnpm typecheck
	docker compose exec core-api pnpm test
	docker compose exec audit-worker pnpm lint
	docker compose exec audit-worker pnpm typecheck
	docker compose exec audit-worker pnpm test
	docker compose exec web pnpm lint
	docker compose exec web pnpm typecheck
	docker compose exec web pnpm test

# Ainda não implementado: entra na Fase 1, quando os contratos OpenAPI/eventos existirem.
contract-test:
	@echo "contract-test: pendente (Fase 1 — contracts/openapi e contracts/events)"

# Ainda não implementado: suíte de integração fim a fim contra a stack conteinerizada.
compose-test:
	@echo "compose-test: pendente (Fase 1+)"
