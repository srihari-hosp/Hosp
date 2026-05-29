import { createDataArchivalWorker } from './dataArchival.worker.js';
import { runWorkerProcess } from './workerRuntime.js';

void runWorkerProcess('data-archival', createDataArchivalWorker);
