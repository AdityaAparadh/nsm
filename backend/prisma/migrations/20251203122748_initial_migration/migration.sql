-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'INSTRUCTOR', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('LOCAL', 'REMOTE');

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roles" "Role"[],
    "additional_info" JSONB,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "total_assignments" INTEGER NOT NULL DEFAULT 0,
    "required_passed_assignments" INTEGER,
    "additional_info" JSONB,

    CONSTRAINT "workshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_instructor" (
    "id" SERIAL NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "instructor_id" INTEGER NOT NULL,

    CONSTRAINT "workshop_instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment" (
    "id" SERIAL NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maximum_score" INTEGER NOT NULL,
    "passing_score" INTEGER NOT NULL,
    "assignment_order" INTEGER NOT NULL,
    "is_compulsory" BOOLEAN NOT NULL DEFAULT true,
    "evaluation_type" "EvaluationType" NOT NULL,

    CONSTRAINT "assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment" (
    "id" SERIAL NOT NULL,
    "participant_id" INTEGER NOT NULL,
    "workshop_id" INTEGER NOT NULL,

    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate" (
    "id" SERIAL NOT NULL,
    "participant_id" INTEGER NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "uuid" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission" (
    "id" SERIAL NOT NULL,
    "participant_id" INTEGER NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_instructor_workshop_id_instructor_id_key" ON "workshop_instructor"("workshop_id", "instructor_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_workshop_id_assignment_order_key" ON "assignment"("workshop_id", "assignment_order");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_participant_id_workshop_id_key" ON "enrollment"("participant_id", "workshop_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_uuid_key" ON "certificate"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_participant_id_workshop_id_key" ON "certificate"("participant_id", "workshop_id");

-- CreateIndex
CREATE UNIQUE INDEX "submission_participant_id_assignment_id_key" ON "submission"("participant_id", "assignment_id");

-- AddForeignKey
ALTER TABLE "workshop_instructor" ADD CONSTRAINT "workshop_instructor_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_instructor" ADD CONSTRAINT "workshop_instructor_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
