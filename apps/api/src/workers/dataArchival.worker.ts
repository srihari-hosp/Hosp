import { Worker } from 'bullmq';
import { logger } from '../logger/index.js';
import { bullmqConnection, bullmqPrefix } from '../queue/connection.js';
import { QUEUE_NAMES, type DataArchivalJobData } from '../queue/types.js';

export const createDataArchivalWorker = (): Worker<DataArchivalJobData> => {
  const worker = new Worker<DataArchivalJobData>(
    QUEUE_NAMES.DATA_ARCHIVAL,
    async (job) => {
      logger.info('Data archival job processed', {
        queue: QUEUE_NAMES.DATA_ARCHIVAL,
        jobId: job.id,
        hospitalId: job.data.hospitalId,
        entityType: job.data.entityType,
        entityId: job.data.entityId,
      });
    },
    {
      connection: bullmqConnection,
      prefix: bullmqPrefix,
      concurrency: Number(process.env.DATA_ARCHIVAL_WORKER_CONCURRENCY ?? 2),
    }
  );

  worker.on('failed', (job, error) => {
    logger.error('Data archival job failed', {
      queue: QUEUE_NAMES.DATA_ARCHIVAL,
      jobId: job?.id,
      error: error.message,
    });
  });

  return worker;
};
