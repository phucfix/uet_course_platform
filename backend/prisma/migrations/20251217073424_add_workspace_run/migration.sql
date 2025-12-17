-- CreateTable
CREATE TABLE "WorkspaceRun" (
    "id" TEXT NOT NULL,
    "githubLogin" TEXT,
    "repoFullName" TEXT NOT NULL,
    "branch" TEXT,
    "tool" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT,
    "rawResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceRun_pkey" PRIMARY KEY ("id")
);
