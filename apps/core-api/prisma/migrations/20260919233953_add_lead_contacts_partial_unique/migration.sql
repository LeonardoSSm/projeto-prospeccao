-- Índice parcial (docs/DOCUMENTATION.md seção 3.3): unicidade de contato só entre
-- registros não excluídos logicamente. Não é expressável no schema.prisma.
CREATE UNIQUE INDEX "uq_lead_contact_value"
    ON "lead_contacts" ("lead_id", "type", "normalized_value")
    WHERE "deleted_at" IS NULL;
