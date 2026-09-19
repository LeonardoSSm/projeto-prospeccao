-- Índice funcional para suporte operacional (busca por e-mail sem diferenciar caixa).
-- Não é expressável no schema.prisma; mantido como SQL manual (docs/DOCUMENTATION.md seção 3.3).
-- E-mail nunca é usado como identidade imutável — users.oidc_subject já cumpre esse papel.
CREATE INDEX "users_email_lower_idx" ON "users" (lower("email"));
