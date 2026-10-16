-- Create project invitation lifecycle records. Invitation tokens are stored as hashes.
CREATE TYPE "ProjectInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED');
ALTER TYPE "ActivityType" ADD VALUE 'MEMBER_REMOVED';
ALTER TYPE "ActivityType" ADD VALUE 'INVITATION_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'INVITATION_ACCEPTED';
ALTER TYPE "ActivityType" ADD VALUE 'INVITATION_REVOKED';

CREATE TABLE "ProjectInvitation" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'EDITOR',
    "tokenHash" TEXT NOT NULL,
    "status" "ProjectInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectInvitation_tokenHash_key" ON "ProjectInvitation"("tokenHash");
CREATE INDEX "ProjectInvitation_projectId_createdAt_idx" ON "ProjectInvitation"("projectId", "createdAt");
CREATE INDEX "ProjectInvitation_projectId_email_status_idx" ON "ProjectInvitation"("projectId", "email", "status");
CREATE INDEX "ProjectInvitation_email_status_idx" ON "ProjectInvitation"("email", "status");
CREATE INDEX "ProjectInvitation_expiresAt_status_idx" ON "ProjectInvitation"("expiresAt", "status");

ALTER TABLE "ProjectInvitation" ADD CONSTRAINT "ProjectInvitation_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectInvitation" ADD CONSTRAINT "ProjectInvitation_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
