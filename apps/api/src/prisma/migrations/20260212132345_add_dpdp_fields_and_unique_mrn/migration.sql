/*
  Warnings:

  - A unique constraint covering the columns `[mrn]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.

*/
-- Keep the composite unique constraint for multi-tenant isolation
-- (no changes needed if the original index already exists)

-- AlterTable
ALTER TABLE "Hospital" ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;



-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
