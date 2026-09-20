-- CreateTable
CREATE TABLE "website_snapshots" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "requested_url" TEXT NOT NULL,
    "final_url" TEXT,
    "http_status" INTEGER,
    "content_hash" TEXT,
    "captured_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_audits" (
    "id" UUID NOT NULL,
    "website_snapshot_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "engine_version" TEXT,
    "performance_score" INTEGER,
    "accessibility_score" INTEGER,
    "seo_score" INTEGER,
    "best_practices_score" INTEGER,
    "technical_metrics" JSONB,
    "features_detected" JSONB,
    "report_object_key" TEXT,
    "screenshot_object_key" TEXT,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "id" UUID NOT NULL,
    "website_audit_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,

    CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "website_snapshots_lead_id_captured_at_idx" ON "website_snapshots"("lead_id", "captured_at" DESC);

-- CreateIndex
CREATE INDEX "website_audits_website_snapshot_id_created_at_idx" ON "website_audits"("website_snapshot_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "website_audits_status_created_at_idx" ON "website_audits"("status", "created_at");

-- CreateIndex
CREATE INDEX "audit_findings_website_audit_id_severity_category_idx" ON "audit_findings"("website_audit_id", "severity", "category");

-- CreateIndex
CREATE INDEX "audit_findings_code_idx" ON "audit_findings"("code");

-- AddForeignKey
ALTER TABLE "website_snapshots" ADD CONSTRAINT "website_snapshots_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_audits" ADD CONSTRAINT "website_audits_website_snapshot_id_fkey" FOREIGN KEY ("website_snapshot_id") REFERENCES "website_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_website_audit_id_fkey" FOREIGN KEY ("website_audit_id") REFERENCES "website_audits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
