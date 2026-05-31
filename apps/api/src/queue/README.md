# Queue

BullMQ queues are defined in this folder:

- `pdf-generation`: creates prescription PDF files asynchronously.
- `invoice-pdf`: creates invoice PDF files asynchronously.
- `notifications`: receives events after PDF generation (ready for SMS/email integration).
- `data-archival`: receives archival events for generated PDF references.

Runtime:

- Queue connection uses `REDIS_URL`.
- API enqueues jobs via `enqueuePrescriptionPdfGeneration`.
- API enqueues invoice jobs via `enqueueInvoicePdfGeneration`.
- Workers run as separate processes under `src/workers`.
