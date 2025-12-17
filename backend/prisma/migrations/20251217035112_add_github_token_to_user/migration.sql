-- AlterTable
ALTER TABLE "User" ADD COLUMN     "githubAccessToken" TEXT,
ADD COLUMN     "githubAccessTokenUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "githubTokenScopes" TEXT;
