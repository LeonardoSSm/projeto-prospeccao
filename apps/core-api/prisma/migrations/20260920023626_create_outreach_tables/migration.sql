-- CreateTable
CREATE TABLE "outreach_messages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "content" TEXT NOT NULL,
    "recipient_value" TEXT NOT NULL,
    "approved_by" UUID,
    "rejected_reason" TEXT,
    "failure_reason" TEXT,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "outreach_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_suppressions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "normalized_value_hash" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outreach_messages_lead_id_created_at_idx" ON "outreach_messages"("lead_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "outreach_messages_organization_id_status_idx" ON "outreach_messages"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "contact_suppressions_organization_id_channel_normalized_val_key" ON "contact_suppressions"("organization_id", "channel", "normalized_value_hash");

-- AddForeignKey
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
