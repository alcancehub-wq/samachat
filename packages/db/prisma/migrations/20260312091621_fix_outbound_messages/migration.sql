-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "access_profile_id" TEXT,
ADD COLUMN     "permissions_override" JSONB;

-- CreateTable
CREATE TABLE "AccessProfile" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "system_role" "Role" NOT NULL DEFAULT 'agent',
    "permissions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessProfile_tenant_id_idx" ON "AccessProfile"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "AccessProfile_tenant_id_name_key" ON "AccessProfile"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "Membership_access_profile_id_idx" ON "Membership"("access_profile_id");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_access_profile_id_fkey" FOREIGN KEY ("access_profile_id") REFERENCES "AccessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessProfile" ADD CONSTRAINT "AccessProfile_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
