-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "brandColor" TEXT NOT NULL DEFAULT '#1e3a5f',
ADD COLUMN     "brandLogoText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "brandLogoUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "brandTagline" TEXT NOT NULL DEFAULT '';
