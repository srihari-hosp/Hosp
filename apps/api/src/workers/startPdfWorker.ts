import { createPdfGenerationWorker } from './pdfGeneration.worker.js';
import { runWorkerProcess } from './workerRuntime.js';

void runWorkerProcess('pdf-generation', createPdfGenerationWorker);
