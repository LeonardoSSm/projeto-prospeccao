-- DropIndex
DROP INDEX "leads_organization_id_normalized_domain_key";

-- Índice parcial (docs/DOCUMENTATION.md seção 3.3): domínio único por organização,
-- mas libera o domínio para reuso quando o lead foi mesclado (merged_into_id preenchido).
CREATE UNIQUE INDEX "uq_leads_org_domain"
    ON "leads" ("organization_id", "normalized_domain")
    WHERE "normalized_domain" IS NOT NULL AND "merged_into_id" IS NULL;

-- Índice parcial para a fila de "próxima ação" (docs/DOCUMENTATION.md seção 3.3).
CREATE INDEX "idx_leads_next_action"
    ON "leads" ("organization_id", "next_action_at")
    WHERE "next_action_at" IS NOT NULL AND "crm_stage" NOT IN ('WON', 'LOST');
