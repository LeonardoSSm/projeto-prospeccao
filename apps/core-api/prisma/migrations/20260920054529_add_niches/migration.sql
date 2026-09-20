-- CreateTable
CREATE TABLE "niches" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "niches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "niches_organization_id_active_idx" ON "niches"("organization_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "niches_organization_id_category_key" ON "niches"("organization_id", "category");

-- AddForeignKey
ALTER TABLE "niches" ADD CONSTRAINT "niches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
