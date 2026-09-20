-- AlterTable
ALTER TABLE "leads" ADD COLUMN "cnpj" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "leads_organization_id_cnpj_key" ON "leads"("organization_id", "cnpj");

-- CreateTable
CREATE TABLE "cnpj_establishments" (
    "id" UUID NOT NULL,
    "cnpj" TEXT NOT NULL,
    "matriz_filial" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "situacao_cadastral" TEXT NOT NULL,
    "data_situacao" DATE,
    "cnae_fiscal_principal" TEXT NOT NULL,
    "cnaes_secundarios" TEXT[],
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cep" TEXT,
    "municipio_codigo" TEXT NOT NULL,
    "municipio_nome" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "ddd1" TEXT,
    "telefone1" TEXT,
    "ddd2" TEXT,
    "telefone2" TEXT,
    "email" TEXT,
    "data_inicio_atividade" DATE,
    "porte" TEXT,
    "capital_social" DECIMAL(18,2),
    "imported_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cnpj_establishments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cnpj_establishments_cnpj_key" ON "cnpj_establishments"("cnpj");

-- CreateIndex
CREATE INDEX "cnpj_establishments_municipio_codigo_cnae_fiscal_principal_idx" ON "cnpj_establishments"("municipio_codigo", "cnae_fiscal_principal");
