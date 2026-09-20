-- CreateTable
CREATE TABLE "score_policies" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "factors_config" JSONB NOT NULL,
    "effective_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMPTZ,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "score_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_scores" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "policy_version" TEXT NOT NULL,
    "raw_score" INTEGER NOT NULL,
    "total_score" INTEGER NOT NULL,
    "band" TEXT NOT NULL,
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_factors" (
    "id" UUID NOT NULL,
    "lead_score_id" UUID NOT NULL,
    "factor_code" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "evidence" JSONB NOT NULL,

    CONSTRAINT "score_factors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "score_policies_version_key" ON "score_policies"("version");

-- CreateIndex
CREATE INDEX "lead_scores_lead_id_calculated_at_idx" ON "lead_scores"("lead_id", "calculated_at" DESC);

-- CreateIndex
CREATE INDEX "score_factors_lead_score_id_idx" ON "score_factors"("lead_score_id");

-- AddForeignKey
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_factors" ADD CONSTRAINT "score_factors_lead_score_id_fkey" FOREIGN KEY ("lead_score_id") REFERENCES "lead_scores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
