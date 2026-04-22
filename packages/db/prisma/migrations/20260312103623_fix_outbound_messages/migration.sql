-- CreateTable
CREATE TABLE "MembershipAccessProfile" (
    "id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "access_profile_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipAccessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipAccessProfile_membership_id_idx" ON "MembershipAccessProfile"("membership_id");

-- CreateIndex
CREATE INDEX "MembershipAccessProfile_access_profile_id_idx" ON "MembershipAccessProfile"("access_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipAccessProfile_membership_id_access_profile_id_key" ON "MembershipAccessProfile"("membership_id", "access_profile_id");

-- AddForeignKey
ALTER TABLE "MembershipAccessProfile" ADD CONSTRAINT "MembershipAccessProfile_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipAccessProfile" ADD CONSTRAINT "MembershipAccessProfile_access_profile_id_fkey" FOREIGN KEY ("access_profile_id") REFERENCES "AccessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
