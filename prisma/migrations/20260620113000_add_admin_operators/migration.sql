-- Sprint 11A: Supabase-backed admin operator identity.
-- Additive only: keeps existing static admin token flow working during migration.

CREATE TYPE "AdminOperatorRole" AS ENUM ('SUPER_ADMIN', 'OPS_ADMIN', 'OPS_VIEWER', 'FINANCE');

CREATE TABLE "AdminOperator" (
    "id" TEXT NOT NULL,
    "supabaseUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "AdminOperatorRole" NOT NULL DEFAULT 'OPS_VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminOperator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminOperator_supabaseUserId_key" ON "AdminOperator"("supabaseUserId");
CREATE INDEX "AdminOperator_email_idx" ON "AdminOperator"("email");
CREATE INDEX "AdminOperator_role_isActive_idx" ON "AdminOperator"("role", "isActive");

ALTER TABLE "AdminAuditLog" ADD COLUMN "operatorId" TEXT;
ALTER TABLE "AdminAuditLog" ADD COLUMN "actorEmail" TEXT;
ALTER TABLE "AdminAuditLog" ADD COLUMN "actorRole" "AdminOperatorRole";
ALTER TABLE "AdminAuditLog" ADD COLUMN "authProvider" TEXT;
CREATE INDEX "AdminAuditLog_operatorId_createdAt_idx" ON "AdminAuditLog"("operatorId", "createdAt");
