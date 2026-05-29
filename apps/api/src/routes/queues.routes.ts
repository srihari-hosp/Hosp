import { type JobState, type Queue } from 'bullmq';
import { Router } from 'express';
import { AppError } from '../errors/AppError.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { queueMap } from '../queue/queues.js';
import { QUEUE_NAMES, type QueueName } from '../queue/types.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const getJobSnapshot = async (queue: Queue, jobId: string) => {
  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = (await job.getState()) as JobState;
  return {
    id: job.id?.toString() ?? null,
    name: job.name,
    state,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason || null,
    processedOn: job.processedOn ?? null,
    finishedOn: job.finishedOn ?? null,
    returnvalue: job.returnvalue ?? null,
  };
};

router.get(
  '/status',
  authenticate,
  authorize('ADMIN', 'DOCTOR'),
  asyncHandler(async (req, res) => {
    const queueStatsEntries = await Promise.all(
      Object.entries(queueMap).map(async ([queueName, queue]) => {
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
          'paused'
        );

        return [queueName, counts] as const;
      })
    );

    const queueStats = Object.fromEntries(queueStatsEntries);
    const queueName = req.query.queue;
    const jobId = req.query.jobId;

    if (queueName !== undefined || jobId !== undefined) {
      if (typeof queueName !== 'string' || !(queueName in queueMap)) {
        throw new AppError(
          `query.queue is required and must be one of: ${Object.values(QUEUE_NAMES).join(', ')}`,
          400
        );
      }

      if (typeof jobId !== 'string' || jobId.trim().length === 0) {
        throw new AppError('query.jobId is required when query.queue is provided', 400);
      }

      const job = await getJobSnapshot(queueMap[queueName as QueueName], jobId);
      return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        queues: queueStats,
        job,
      });
    }

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      queues: queueStats,
    });
  })
);

export { router as queuesRouter };
