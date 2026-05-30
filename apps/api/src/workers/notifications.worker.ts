import { Worker } from 'bullmq';
import { logger } from '../logger/index.js';
import { bullmqConnection, bullmqPrefix } from '../queue/connection.js';
import { QUEUE_NAMES, type NotificationJobData } from '../queue/types.js';

export const createNotificationsWorker = (): Worker<NotificationJobData> => {
  const parsedConcurrency = Number(process.env.NOTIFICATIONS_WORKER_CONCURRENCY ?? 5);
  const concurrency =
    Number.isInteger(parsedConcurrency) && parsedConcurrency > 0 ? parsedConcurrency : 5;

  const worker = new Worker<NotificationJobData>(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job) => {
      logger.info('Notification job processed', {
        queue: QUEUE_NAMES.NOTIFICATIONS,
        jobId: job.id,
        type: job.data.type,
        prescriptionId: job.data.prescriptionId,
        invoiceId: job.data.invoiceId,
        requestedBy: job.data.requestedBy,
      });
    },
    {
      connection: bullmqConnection,
      prefix: bullmqPrefix,
      concurrency,
    }
  );

  worker.on('failed', (job, error) => {
    logger.error('Notification job failed', {
      queue: QUEUE_NAMES.NOTIFICATIONS,
      jobId: job?.id,
      error: error.message,
    });
  });

  return worker;
};
