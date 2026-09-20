-- DropIndex
DROP INDEX "website_audits_status_created_at_idx";

-- Índice parcial (docs/DOCUMENTATION.md seção 3.3): só cobre auditorias ainda em
-- andamento, que é a consulta operacional frequente (fila/monitoramento).
CREATE INDEX "idx_website_audits_pending"
    ON "website_audits" ("status", "created_at")
    WHERE "status" IN ('QUEUED', 'RUNNING');
