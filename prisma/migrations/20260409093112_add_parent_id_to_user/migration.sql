-- AlterTable
ALTER TABLE "User" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';
