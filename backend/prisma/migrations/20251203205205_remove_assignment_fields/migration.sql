/*
  Warnings:

  - You are about to drop the column `assignment_order` on the `assignment` table. All the data in the column will be lost.
  - You are about to drop the column `grader_image` on the `assignment` table. All the data in the column will be lost.
  - You are about to drop the column `notebook_path` on the `assignment` table. All the data in the column will be lost.
  - You are about to drop the column `reference_data` on the `assignment` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "assignment_workshop_id_assignment_order_key";

-- AlterTable
ALTER TABLE "assignment" DROP COLUMN "assignment_order",
DROP COLUMN "grader_image",
DROP COLUMN "notebook_path",
DROP COLUMN "reference_data";
