export const QUEUE_NAMES = {
  PDF_GENERATION: 'pdf-generation',
  INVOICE_PDF: 'invoice-pdf',
  NOTIFICATIONS: 'notifications',
  DATA_ARCHIVAL: 'data-archival',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface PdfGenerationJobData {
  prescriptionId: string;
  hospitalId: string;
  requestedBy: string;
}

export interface PdfGenerationJobResult {
  prescriptionId: string;
  pdfPath: string;
  pdfUrl: string;
  generatedAt: string;
}

export interface NotificationJobData {
  type: 'PRESCRIPTION_PDF_READY' | 'INVOICE_PDF_READY';
  hospitalId: string;
  prescriptionId?: string;
  invoiceId?: string;
  requestedBy: string;
  pdfUrl: string;
}

export interface DataArchivalJobData {
  hospitalId: string;
  entityType: 'PRESCRIPTION_PDF' | 'INVOICE_PDF';
  entityId: string;
  filePath: string;
}

export interface InvoicePdfJobData {
  invoiceId: string;
  hospitalId: string;
  requestedBy: string;
}

export interface InvoicePdfJobResult {
  invoiceId: string;
  pdfPath: string;
  pdfUrl: string;
  generatedAt: string;
}
