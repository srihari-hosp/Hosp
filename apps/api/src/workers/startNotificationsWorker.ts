import { createNotificationsWorker } from './notifications.worker.js';
import { runWorkerProcess } from './workerRuntime.js';

void runWorkerProcess('notifications', createNotificationsWorker);
