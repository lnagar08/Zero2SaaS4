/*
  Warnings:

  - The `breakdownOnPastDue` column on the `FlowControl` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `breakdownOnInactivity` column on the `FlowControl` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `breakdownOnStepOverdue` column on the `FlowControl` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `isRequired` column on the `FlowStep` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `startDate` column on the `Matter` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `targetEndDate` column on the `Matter` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `completedDate` column on the `Matter` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `isPublic` on the `MatterFlow` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `MatterFlow` table. All the data in the column will be lost.
  - The `isDefault` column on the `MatterFlow` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `startedAt` column on the `MatterStageProgress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `completedAt` column on the `MatterStageProgress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `isRequired` column on the `MatterStepProgress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `isCompleted` column on the `MatterStepProgress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `completedAt` column on the `MatterStepProgress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `dueDate` column on the `MatterStepProgress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `manualDueDate` column on the `MatterStepProgress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `withClient` column on the `MatterStepProgress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[orgId]` on the table `FlowControl` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "FlowControl" DROP CONSTRAINT "FlowControl_orgId_fkey";

-- DropForeignKey
ALTER TABLE "FlowStage" DROP CONSTRAINT "FlowStage_orgId_fkey";

-- DropForeignKey
ALTER TABLE "FlowStep" DROP CONSTRAINT "FlowStep_orgId_fkey";

-- DropForeignKey
ALTER TABLE "Matter" DROP CONSTRAINT "Matter_orgId_fkey";

-- DropForeignKey
ALTER TABLE "MatterFlow" DROP CONSTRAINT "MatterFlow_orgId_fkey";

-- DropForeignKey
ALTER TABLE "MatterStageProgress" DROP CONSTRAINT "MatterStageProgress_orgId_fkey";

-- DropForeignKey
ALTER TABLE "MatterStepProgress" DROP CONSTRAINT "MatterStepProgress_orgId_fkey";

-- DropIndex
DROP INDEX "FlowControl_orgId_idx";

-- AlterTable
ALTER TABLE "FlowControl" DROP COLUMN "breakdownOnPastDue",
ADD COLUMN     "breakdownOnPastDue" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "breakdownOnInactivity",
ADD COLUMN     "breakdownOnInactivity" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "breakdownOnStepOverdue",
ADD COLUMN     "breakdownOnStepOverdue" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FlowStep" DROP COLUMN "isRequired",
ADD COLUMN     "isRequired" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Matter" DROP COLUMN "startDate",
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "targetEndDate",
ADD COLUMN     "targetEndDate" TIMESTAMP(3),
DROP COLUMN "completedDate",
ADD COLUMN     "completedDate" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MatterFlow" DROP COLUMN "isPublic",
DROP COLUMN "publishedAt",
DROP COLUMN "isDefault",
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MatterStageProgress" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "startedAt",
ADD COLUMN     "startedAt" TIMESTAMP(3),
DROP COLUMN "completedAt",
ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MatterStepProgress" ADD COLUMN     "withClientSince" TIMESTAMP(3),
DROP COLUMN "isRequired",
ADD COLUMN     "isRequired" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "isCompleted",
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "completedAt",
ADD COLUMN     "completedAt" TIMESTAMP(3),
DROP COLUMN "dueDate",
ADD COLUMN     "dueDate" TIMESTAMP(3),
DROP COLUMN "manualDueDate",
ADD COLUMN     "manualDueDate" TIMESTAMP(3),
DROP COLUMN "withClient",
ADD COLUMN     "withClient" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "FlowControl_orgId_key" ON "FlowControl"("orgId");

-- CreateIndex
CREATE INDEX "FlowStage_matterFlowId_idx" ON "FlowStage"("matterFlowId");

-- CreateIndex
CREATE INDEX "FlowStep_stageId_idx" ON "FlowStep"("stageId");

-- CreateIndex
CREATE INDEX "Matter_assignedUserId_idx" ON "Matter"("assignedUserId");

-- CreateIndex
CREATE INDEX "Matter_matterFlowId_idx" ON "Matter"("matterFlowId");

-- CreateIndex
CREATE INDEX "MatterStageProgress_matterId_idx" ON "MatterStageProgress"("matterId");

-- CreateIndex
CREATE INDEX "MatterStepProgress_matterStageProgressId_idx" ON "MatterStepProgress"("matterStageProgressId");

-- AddForeignKey
ALTER TABLE "MatterFlow" ADD CONSTRAINT "MatterFlow_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowStage" ADD CONSTRAINT "FlowStage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowStage" ADD CONSTRAINT "FlowStage_matterFlowId_fkey" FOREIGN KEY ("matterFlowId") REFERENCES "MatterFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowStep" ADD CONSTRAINT "FlowStep_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowStep" ADD CONSTRAINT "FlowStep_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "FlowStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_matterFlowId_fkey" FOREIGN KEY ("matterFlowId") REFERENCES "MatterFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterStageProgress" ADD CONSTRAINT "MatterStageProgress_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterStageProgress" ADD CONSTRAINT "MatterStageProgress_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterStepProgress" ADD CONSTRAINT "MatterStepProgress_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterStepProgress" ADD CONSTRAINT "MatterStepProgress_matterStageProgressId_fkey" FOREIGN KEY ("matterStageProgressId") REFERENCES "MatterStageProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowControl" ADD CONSTRAINT "FlowControl_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
