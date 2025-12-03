/*
  Warnings:

  - You are about to drop the column `workshop_id` on the `submission` table. All the data in the column will be lost.
  - You are about to drop the column `total_assignments` on the `workshop` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[participant_id,assignment_id,attempt_number]` on the table `submission` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'DROPPED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "WorkshopStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "submission" DROP CONSTRAINT "submission_workshop_id_fkey";

-- DropIndex
DROP INDEX "submission_participant_id_assignment_id_key";

-- AlterTable
ALTER TABLE "assignment" ADD COLUMN     "grader_image" TEXT,
ADD COLUMN     "notebook_path" TEXT,
ADD COLUMN     "reference_data" JSONB,
ADD COLUMN     "s3_eval_binary_key" TEXT;

-- AlterTable
ALTER TABLE "enrollment" ADD COLUMN     "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "submission" DROP COLUMN "workshop_id",
ADD COLUMN     "attempt_number" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "workshop" DROP COLUMN "total_assignments",
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "s3_home_zip_key" TEXT,
ADD COLUMN     "start_date" TIMESTAMP(3),
ADD COLUMN     "status" "WorkshopStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE UNIQUE INDEX "submission_participant_id_assignment_id_attempt_number_key" ON "submission"("participant_id", "assignment_id", "attempt_number");
