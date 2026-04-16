-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "permissions" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "permissions" JSONB DEFAULT '{}';
