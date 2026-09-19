.PHONY: up down logs ps migrate verify contract-test compose-test

up:
	docker compose --env-file .env.local up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

migrate:
	docker compose run --rm core-api-migrate

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
