-- CreateTable
CREATE TABLE "dialog_variables" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "placeholder" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dialog_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dialog_tag_meta" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "color_background" TEXT NOT NULL,
    "color_text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dialog_tag_meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dialog_variables_tenant_id_idx" ON "dialog_variables"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "dialog_variables_tenant_id_placeholder_key" ON "dialog_variables"("tenant_id", "placeholder");

-- CreateIndex
CREATE UNIQUE INDEX "dialog_variables_tenant_id_name_key" ON "dialog_variables"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "dialog_tag_meta_tenant_id_idx" ON "dialog_tag_meta"("tenant_id");

-- CreateIndex
CREATE INDEX "dialog_tag_meta_sort_order_idx" ON "dialog_tag_meta"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "dialog_tag_meta_tag_id_key" ON "dialog_tag_meta"("tag_id");

-- AddForeignKey
ALTER TABLE "dialog_variables" ADD CONSTRAINT "dialog_variables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dialog_tag_meta" ADD CONSTRAINT "dialog_tag_meta_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dialog_tag_meta" ADD CONSTRAINT "dialog_tag_meta_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
