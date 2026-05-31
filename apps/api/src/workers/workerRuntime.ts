import type { Worker } from 'bullmq';
import { logger } from '../logger/index.js';

export const runWorkerProcess = async (
  workerName: string,
  createWorker: () => Worker
): Promise<void> => {
  const worker = createWorker();
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${workerName} worker received shutdown signal`, { signal });
    try {
      await worker.close();
      process.exit(0);
    } catch (error) {
      logger.error(`${workerName} worker failed during shutdown`, { signal, error });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    shutdown('SIGINT').catch(err => logger.error('Unhandled shutdown error', { err }));
  });
  process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch(err => logger.error('Unhandled shutdown error', { err }));
  });

  logger.info(`${workerName} worker started`);
};
