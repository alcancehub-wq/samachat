/*
  Warnings:

  - Added the required column `interval_seconds` to the `campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_at` to the `campaigns` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DialogType" AS ENUM ('message', 'template', 'automation');

-- CreateEnum
CREATE TYPE "DialogChannel" AS ENUM ('whatsapp');

-- CreateEnum
CREATE TYPE "DialogStatus" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "dialog_id" TEXT,
ADD COLUMN     "interval_seconds" INTEGER NOT NULL,
ADD COLUMN     "start_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Dialog" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group_name" TEXT,
    "type" "DialogType" NOT NULL,
    "channel" "DialogChannel" NOT NULL DEFAULT 'whatsapp',
    "status" "DialogStatus" NOT NULL DEFAULT 'active',
    "message_text" TEXT,
    "media_url" TEXT,
    "template_name" TEXT,
    "template_id" TEXT,
    "template_language" TEXT,
    "template_variables" JSONB,
    "automation_actions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dialog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dialog_tenant_id_idx" ON "Dialog"("tenant_id");

-- CreateIndex
CREATE INDEX "Dialog_type_idx" ON "Dialog"("type");

-- CreateIndex
CREATE INDEX "Dialog_group_name_idx" ON "Dialog"("group_name");

-- CreateIndex
CREATE INDEX "campaigns_dialog_id_idx" ON "campaigns"("dialog_id");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_dialog_id_fkey" FOREIGN KEY ("dialog_id") REFERENCES "Dialog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dialog" ADD CONSTRAINT "Dialog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
