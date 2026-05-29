import type { Worker } from 'bullmq';
import { logger } from '../logger/index.js';

export const runWorkerProcess = async (
  workerName: string,
  createWorker: () => Worker
): Promise<void> => {
  const worker = createWorker();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info(`${workerName} worker received shutdown signal`, { signal });
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  logger.info(`${workerName} worker started`);
};
