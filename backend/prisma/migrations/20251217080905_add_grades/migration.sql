-- AlterTable
ALTER TABLE "WorkspaceRun" ADD COLUMN     "assignmentId" TEXT,
ADD COLUMN     "commitSha" TEXT,
ADD COLUMN     "maxScore" DOUBLE PRECISION,
ADD COLUMN     "passed" INTEGER,
ADD COLUMN     "score" DOUBLE PRECISION,
ADD COLUMN     "total" INTEGER;
