import { Worker } from 'bullmq';
import { logger } from '../logger/index.js';
import { dataArchivalQueue, notificationsQueue } from '../queue/queues.js';
import { bullmqConnection, bullmqPrefix } from '../queue/connection.js';
import { QUEUE_NAMES, type PdfGenerationJobData, type PdfGenerationJobResult } from '../queue/types.js';
import { pdfService } from '../services/pdf.service.js';

export const createPdfGenerationWorker = (): Worker<PdfGenerationJobData, PdfGenerationJobResult> => {
  const worker = new Worker<PdfGenerationJobData, PdfGenerationJobResult>(
    QUEUE_NAMES.PDF_GENERATION,
    async (job) => {
      const generated = await pdfService.generatePrescriptionPdf({
        prescriptionId: job.data.prescriptionId,
        hospitalId: job.data.hospitalId,
      });

      await notificationsQueue.add('notify-pdf-ready', {
        type: 'PRESCRIPTION_PDF_READY',
        hospitalId: job.data.hospitalId,
        prescriptionId: job.data.prescriptionId,
        requestedBy: job.data.requestedBy,
        pdfUrl: generated.pdfUrl,
      });

      await dataArchivalQueue.add('archive-pdf-reference', {
        hospitalId: job.data.hospitalId,
        entityType: 'PRESCRIPTION_PDF',
        entityId: job.data.prescriptionId,
        filePath: generated.pdfPath,
      });

      return {
        prescriptionId: job.data.prescriptionId,
        pdfPath: generated.pdfPath,
        pdfUrl: generated.pdfUrl,
        generatedAt: generated.generatedAt.toISOString(),
      };
    },
    {
      connection: bullmqConnection,
      prefix: bullmqPrefix,
      concurrency: Number(process.env.PDF_WORKER_CONCURRENCY ?? 2),
    }
  );

  worker.on('completed', (job) => {
    logger.info('PDF generation job completed', { queue: QUEUE_NAMES.PDF_GENERATION, jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    logger.error('PDF generation job failed', {
      queue: QUEUE_NAMES.PDF_GENERATION,
      jobId: job?.id,
      error: error.message,
    });
  });

  return worker;
};
