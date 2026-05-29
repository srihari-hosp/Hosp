import { Worker } from 'bullmq';
import { logger } from '../logger/index.js';
import { bullmqConnection } from '../queue/connection.js';
import { dataArchivalQueue, notificationsQueue } from '../queue/queues.js';
import { QUEUE_NAMES, type InvoicePdfJobData, type InvoicePdfJobResult } from '../queue/types.js';
import { prisma } from '../prisma/client.js';
import { pdfService } from '../services/pdf.service.js';

export const createInvoicePdfWorker = (): Worker<InvoicePdfJobData, InvoicePdfJobResult> => {
  const worker = new Worker<InvoicePdfJobData, InvoicePdfJobResult>(
    QUEUE_NAMES.INVOICE_PDF,
    async (job) => {
      const generated = await pdfService.generateInvoicePdf({
        invoiceId: job.data.invoiceId,
        hospitalId: job.data.hospitalId,
      });

      await prisma.auditLog.create({
        data: {
          hospitalId: job.data.hospitalId,
          userId: job.data.requestedBy,
          actor: job.data.requestedBy,
          entityType: 'Invoice',
          entityId: job.data.invoiceId,
          changesJson: {
            operation: 'invoice_pdf_generated',
            pdfPath: generated.pdfPath,
            pdfUrl: generated.pdfUrl,
            generatedAt: generated.generatedAt.toISOString(),
          },
          purpose: 'Billing operations',
          timestamp: new Date(),
        },
      });

      await notificationsQueue.add('notify-invoice-pdf-ready', {
        type: 'INVOICE_PDF_READY',
        hospitalId: job.data.hospitalId,
        invoiceId: job.data.invoiceId,
        requestedBy: job.data.requestedBy,
        pdfUrl: generated.pdfUrl,
      });

      await dataArchivalQueue.add('archive-invoice-pdf-reference', {
        hospitalId: job.data.hospitalId,
        entityType: 'INVOICE_PDF',
        entityId: job.data.invoiceId,
        filePath: generated.pdfPath,
      });

      return {
        invoiceId: job.data.invoiceId,
        pdfPath: generated.pdfPath,
        pdfUrl: generated.pdfUrl,
        generatedAt: generated.generatedAt.toISOString(),
      };
    },
    {
      connection: bullmqConnection,
      concurrency: Number(process.env.PDF_WORKER_CONCURRENCY ?? 2),
    }
  );

  worker.on('completed', (job) => {
    logger.info('Invoice PDF generation job completed', { queue: QUEUE_NAMES.INVOICE_PDF, jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    logger.error('Invoice PDF generation job failed', {
      queue: QUEUE_NAMES.INVOICE_PDF,
      jobId: job?.id,
      error: error.message,
    });
  });

  return worker;
};
