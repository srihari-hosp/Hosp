import { Queue } from 'bullmq';
import { bullmqConnection } from './connection.js';
import {
  type InvoicePdfJobData,
  type InvoicePdfJobResult,
  QUEUE_NAMES,
  type DataArchivalJobData,
  type NotificationJobData,
  type PdfGenerationJobData,
  type PdfGenerationJobResult,
  type QueueName,
} from './types.js';

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1_000,
  },
  removeOnComplete: 250,
  removeOnFail: 500,
};

export const pdfGenerationQueue = new Queue<PdfGenerationJobData, PdfGenerationJobResult>(
  QUEUE_NAMES.PDF_GENERATION,
  {
    connection: bullmqConnection,
    defaultJobOptions,
  }
);

export const notificationsQueue = new Queue<NotificationJobData>(QUEUE_NAMES.NOTIFICATIONS, {
  connection: bullmqConnection,
  defaultJobOptions,
});

export const invoicePdfQueue = new Queue<InvoicePdfJobData, InvoicePdfJobResult>(
  QUEUE_NAMES.INVOICE_PDF,
  {
    connection: bullmqConnection,
    defaultJobOptions,
  }
);

export const dataArchivalQueue = new Queue<DataArchivalJobData>(QUEUE_NAMES.DATA_ARCHIVAL, {
  connection: bullmqConnection,
  defaultJobOptions,
});

export const queueMap: Record<QueueName, Queue> = {
  [QUEUE_NAMES.PDF_GENERATION]: pdfGenerationQueue,
  [QUEUE_NAMES.INVOICE_PDF]: invoicePdfQueue,
  [QUEUE_NAMES.NOTIFICATIONS]: notificationsQueue,
  [QUEUE_NAMES.DATA_ARCHIVAL]: dataArchivalQueue,
};

export const enqueuePrescriptionPdfGeneration = async (
  payload: PdfGenerationJobData
): Promise<string> => {
  const job = await pdfGenerationQueue.add('generate-prescription-pdf', payload, {
    jobId: `${payload.hospitalId}__${payload.prescriptionId}`,
  });

  return job.id?.toString() ?? '';
};

export const enqueueInvoicePdfGeneration = async (
  payload: InvoicePdfJobData
): Promise<string> => {
  const job = await invoicePdfQueue.add('generate-invoice-pdf', payload, {
    jobId: `${payload.hospitalId}__${payload.invoiceId}`,
  });

  return job.id?.toString() ?? '';
};
