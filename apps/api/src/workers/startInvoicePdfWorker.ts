import { createInvoicePdfWorker } from './invoicePdf.worker.js';
import { runWorkerProcess } from './workerRuntime.js';

void runWorkerProcess('invoice-pdf', createInvoicePdfWorker);
