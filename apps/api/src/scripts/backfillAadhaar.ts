import { PrismaClient } from '@prisma/client';
import { encryptText } from '../utils/encryption.js';
import { hashSensitiveValue } from '../utils/hash.js';

const prisma = new PrismaClient();

const BATCH_SIZE = 100;

async function backfillAadhaar() {
  console.log('Starting Aadhaar data backfill...');
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  let hasMore = true;
  let cursor = '';

  while (hasMore) {
    try {
      // Fetch patients with legacy aadhaarNumber using raw SQL
      // We use id > cursor to paginate efficiently.
      const queryParams: any[] = [BATCH_SIZE];
      let cursorCondition = '';
      if (cursor) {
        cursorCondition = 'AND id > $2';
        queryParams.push(cursor);
      }

      // Check if the column exists first to avoid crashing if it's already dropped
      const columnExists: Array<{ column_name: string }> = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='Patient' AND column_name='aadhaarNumber';
      `;

      if (columnExists.length === 0) {
        console.log('Legacy aadhaarNumber column does not exist. Backfill is not needed or already completed.');
        break;
      }

      const patients: Array<{ id: string; hospitalId: string; aadhaarNumber: string | null }> = await prisma.$queryRawUnsafe(`
        SELECT id, "hospitalId", "aadhaarNumber" 
        FROM "Patient" 
        WHERE "aadhaarNumber" IS NOT NULL AND "aadhaarNumber" != '' ${cursorCondition}
        ORDER BY id ASC
        LIMIT $1
      `, ...queryParams);

      if (patients.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`Processing batch of ${patients.length} patients...`);

      for (const patient of patients) {
        totalProcessed++;
        try {
          if (!patient.aadhaarNumber) continue;

          const aadhaarHash = hashSensitiveValue(patient.aadhaarNumber);
          const aadhaarEncrypted = encryptText(patient.aadhaarNumber);

          await prisma.patient.update({
            where: { id: patient.id },
            data: {
              aadhaarHash,
              aadhaarEncrypted,
            },
          });
          totalUpdated++;
        } catch (err) {
          console.error(`Failed to backfill patient ID ${patient.id}:`, err);
          totalErrors++;
        }
        cursor = patient.id; // update cursor
      }
    } catch (error) {
      console.error('Error executing backfill batch query:', error);
      break;
    }
  }

  console.log('--------------------------------------------------');
  console.log('Aadhaar Backfill Completed.');
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total updated:   ${totalUpdated}`);
  console.log(`Total errors:    ${totalErrors}`);
  console.log('--------------------------------------------------');
}

backfillAadhaar()
  .catch((e) => {
    console.error('Fatal error during backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
