import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { prisma } from '../prisma/client.js';

interface GeneratePrescriptionPdfInput {
  prescriptionId: string;
  hospitalId: string;
}

interface GenerateInvoicePdfInput {
  invoiceId: string;
  hospitalId: string;
}

interface GeneratedPdf {
  pdfPath: string;
  pdfUrl: string;
  generatedAt: Date;
}

const getStorageRoot = (): string => {
  const cwd = process.cwd().replace(/\\/g, '/');
  return cwd.endsWith('/apps/api')
    ? path.resolve(process.cwd(), 'storage')
    : path.resolve(process.cwd(), 'apps/api/storage');
};

const getPublicBaseUrl = (): string => {
  const configured = process.env.PUBLIC_API_BASE_URL;
  if (configured && configured.trim().length > 0) {
    return configured.replace(/\/$/, '');
  }

  const port = process.env.PORT ?? process.env.API_PORT ?? '4000';
  return `http://localhost:${port}`;
};

const formatDate = (value: Date | null | undefined): string => {
  if (!value) {
    return '-';
  }

  return value.toISOString().split('T')[0];
};

const formatCurrency = (value: string | number): string => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(numeric)
    : String(value);
};

const getHospitalLogoMark = (hospitalName: string): string => {
  const initials = hospitalName
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  return initials || 'H';
};

const createPrescriptionPdfBuffer = async (details: {
  hospitalName: string;
  hospitalAddress: string;
  licenseNo: string;
  patientName: string;
  patientMrn: string;
  doctorName: string;
  doctorSpecialization: string;
  visitedAt: Date;
  prescriptionId: string;
  symptoms: string;
  diagnosis: string | null;
  prescriptions: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    durationDays: number;
  }>;
}): Promise<Uint8Array> => {
  const document = await PDFDocument.create();
  const page = document.addPage([595.28, 841.89]);
  const fontBold = await document.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await document.embedFont(StandardFonts.Helvetica);
  const colorPrimary = rgb(0.08, 0.24, 0.5);

  page.drawRectangle({
    x: 0,
    y: 780,
    width: 595.28,
    height: 61.89,
    color: colorPrimary,
  });

  page.drawText(details.hospitalName, {
    x: 36,
    y: 815,
    font: fontBold,
    size: 16,
    color: rgb(1, 1, 1),
  });
  page.drawText(details.hospitalAddress, {
    x: 36,
    y: 797,
    font: fontRegular,
    size: 10,
    color: rgb(1, 1, 1),
  });
  page.drawText(`License: ${details.licenseNo}`, {
    x: 36,
    y: 784,
    font: fontRegular,
    size: 9,
    color: rgb(1, 1, 1),
  });

  page.drawText('Prescription', {
    x: 36,
    y: 744,
    font: fontBold,
    size: 20,
    color: colorPrimary,
  });

  const visitedAt = details.visitedAt.toISOString().split('T')[0];
  const lines = [
    `Prescription ID: ${details.prescriptionId}`,
    `Date: ${visitedAt}`,
    `Patient: ${details.patientName} (MRN: ${details.patientMrn})`,
    `Doctor: ${details.doctorName} (${details.doctorSpecialization})`,
    `Symptoms: ${details.symptoms}`,
    `Diagnosis: ${details.diagnosis ?? 'Not specified'}`,
    '',
  ];

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: 36,
      y: 712 - (index * 20),
      font: index === 0 ? fontBold : fontRegular,
      size: 11,
      color: rgb(0.1, 0.1, 0.1),
    });
  });

  const tableTop = 712 - (lines.length * 20) - 6;
  const columns = [
    { label: 'Medication', x: 36, width: 210 },
    { label: 'Dosage', x: 246, width: 95 },
    { label: 'Frequency', x: 341, width: 120 },
    { label: 'Duration', x: 461, width: 98 },
  ];

  page.drawRectangle({
    x: 36,
    y: tableTop - 18,
    width: 523,
    height: 18,
    color: rgb(0.9, 0.93, 0.97),
    borderColor: rgb(0.8, 0.84, 0.9),
    borderWidth: 0.8,
  });
  for (const column of columns) {
    page.drawText(column.label, {
      x: column.x + 4,
      y: tableTop - 13,
      font: fontBold,
      size: 10,
      color: rgb(0.15, 0.23, 0.33),
    });
  }

  details.prescriptions.forEach((row, index) => {
    const rowY = tableTop - 18 - ((index + 1) * 20);
    page.drawRectangle({
      x: 36,
      y: rowY,
      width: 523,
      height: 20,
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5,
    });

    page.drawText(row.medication, {
      x: columns[0].x + 4,
      y: rowY + 6,
      font: fontRegular,
      size: 10,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: columns[0].width - 8,
    });
    page.drawText(row.dosage, {
      x: columns[1].x + 4,
      y: rowY + 6,
      font: fontRegular,
      size: 10,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: columns[1].width - 8,
    });
    page.drawText(row.frequency, {
      x: columns[2].x + 4,
      y: rowY + 6,
      font: fontRegular,
      size: 10,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: columns[2].width - 8,
    });
    page.drawText(`${row.durationDays} day(s)`, {
      x: columns[3].x + 4,
      y: rowY + 6,
      font: fontRegular,
      size: 10,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: columns[3].width - 8,
    });
  });

  page.drawLine({
    start: { x: 325, y: 160 },
    end: { x: 559, y: 160 },
    thickness: 1,
    color: rgb(0.6, 0.6, 0.6),
  });
  page.drawText('Doctor Signature', {
    x: 450,
    y: 145,
    font: fontRegular,
    size: 10,
    color: rgb(0.35, 0.35, 0.35),
  });

  return document.save();
};

const createInvoicePdfBuffer = async (details: {
  hospitalName: string;
  hospitalAddress: string;
  licenseNo: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date | null;
  patientName: string;
  patientMrn: string;
  patientPhone: string;
  doctorName: string | null;
  doctorSpecialization: string | null;
  visitDate: Date | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: string;
    gstRate: string;
    lineSubtotal: string;
    lineGst: string;
    lineTotal: string;
  }>;
  subtotal: string;
  gstTotal: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
  notes: string | null;
}): Promise<Uint8Array> => {
  const document = await PDFDocument.create();
  const fontBold = await document.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await document.embedFont(StandardFonts.Helvetica);
  const primary = rgb(0.08, 0.24, 0.5);
  const textColor = rgb(0.1, 0.1, 0.1);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 32;

  let page = document.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - 40;

  const addNewPage = () => {
    page = document.addPage([pageWidth, pageHeight]);
    cursorY = pageHeight - 40;
  };

  const drawHeader = () => {
    page.drawRectangle({
      x: 0,
      y: pageHeight - 92,
      width: pageWidth,
      height: 92,
      color: primary,
    });

    page.drawCircle({
      x: marginX + 18,
      y: pageHeight - 46,
      size: 18,
      color: rgb(0.95, 0.97, 1),
    });
    page.drawText(getHospitalLogoMark(details.hospitalName), {
      x: marginX + 11,
      y: pageHeight - 52,
      font: fontBold,
      size: 12,
      color: primary,
    });

    page.drawText(details.hospitalName, {
      x: marginX + 46,
      y: pageHeight - 42,
      font: fontBold,
      size: 16,
      color: rgb(1, 1, 1),
    });
    page.drawText(details.hospitalAddress, {
      x: marginX + 46,
      y: pageHeight - 58,
      font: fontRegular,
      size: 10,
      color: rgb(1, 1, 1),
    });
    page.drawText(`License: ${details.licenseNo}`, {
      x: marginX + 46,
      y: pageHeight - 73,
      font: fontRegular,
      size: 9,
      color: rgb(1, 1, 1),
    });
    page.drawText('Invoice', {
      x: pageWidth - 112,
      y: pageHeight - 52,
      font: fontBold,
      size: 20,
      color: rgb(1, 1, 1),
    });
  };

  const drawKeyValue = (label: string, value: string, x: number, y: number) => {
    page.drawText(label, {
      x,
      y,
      font: fontBold,
      size: 10,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(value, {
      x: x + 92,
      y,
      font: fontRegular,
      size: 10,
      color: textColor,
    });
  };

  drawHeader();
  cursorY = pageHeight - 126;

  drawKeyValue('Invoice #', details.invoiceNumber, marginX, cursorY);
  drawKeyValue('Invoice Date', formatDate(details.invoiceDate), pageWidth / 2, cursorY);
  cursorY -= 16;
  drawKeyValue('Invoice ID', details.invoiceId, marginX, cursorY);
  drawKeyValue('Due Date', formatDate(details.dueDate), pageWidth / 2, cursorY);
  cursorY -= 24;

  page.drawText('Patient Details', {
    x: marginX,
    y: cursorY,
    font: fontBold,
    size: 11,
    color: primary,
  });
  cursorY -= 16;
  drawKeyValue('Name', details.patientName, marginX, cursorY);
  drawKeyValue('MRN', details.patientMrn, pageWidth / 2, cursorY);
  cursorY -= 16;
  drawKeyValue('Phone', details.patientPhone, marginX, cursorY);
  drawKeyValue('Visit Date', formatDate(details.visitDate), pageWidth / 2, cursorY);
  cursorY -= 16;
  drawKeyValue('Doctor', details.doctorName ?? '-', marginX, cursorY);
  drawKeyValue('Specialization', details.doctorSpecialization ?? '-', pageWidth / 2, cursorY);
  cursorY -= 24;

  const columns = [
    { label: 'Description', x: marginX, width: 206 },
    { label: 'Qty', x: marginX + 206, width: 36 },
    { label: 'Unit Price', x: marginX + 242, width: 80 },
    { label: 'GST %', x: marginX + 322, width: 42 },
    { label: 'GST Amt', x: marginX + 364, width: 72 },
    { label: 'Line Total', x: marginX + 436, width: 126 },
  ];

  const drawTableHeader = () => {
    page.drawRectangle({
      x: marginX,
      y: cursorY - 16,
      width: pageWidth - marginX * 2,
      height: 16,
      color: rgb(0.9, 0.93, 0.97),
      borderColor: rgb(0.8, 0.84, 0.9),
      borderWidth: 0.8,
    });

    for (const column of columns) {
      page.drawText(column.label, {
        x: column.x + 3,
        y: cursorY - 12,
        font: fontBold,
        size: 9,
        color: rgb(0.12, 0.22, 0.34),
      });
    }
    cursorY -= 16;
  };

  drawTableHeader();

  for (const item of details.items) {
    if (cursorY < 130) {
      addNewPage();
      drawHeader();
      cursorY = pageHeight - 126;
      drawTableHeader();
    }

    page.drawRectangle({
      x: marginX,
      y: cursorY - 20,
      width: pageWidth - marginX * 2,
      height: 20,
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5,
    });

    page.drawText(item.description, {
      x: columns[0].x + 3,
      y: cursorY - 14,
      font: fontRegular,
      size: 9,
      color: textColor,
      maxWidth: columns[0].width - 6,
    });
    page.drawText(String(item.quantity), {
      x: columns[1].x + 3,
      y: cursorY - 14,
      font: fontRegular,
      size: 9,
      color: textColor,
    });
    page.drawText(formatCurrency(item.unitPrice), {
      x: columns[2].x + 3,
      y: cursorY - 14,
      font: fontRegular,
      size: 9,
      color: textColor,
      maxWidth: columns[2].width - 6,
    });
    page.drawText(`${item.gstRate}%`, {
      x: columns[3].x + 3,
      y: cursorY - 14,
      font: fontRegular,
      size: 9,
      color: textColor,
    });
    page.drawText(formatCurrency(item.lineGst), {
      x: columns[4].x + 3,
      y: cursorY - 14,
      font: fontRegular,
      size: 9,
      color: textColor,
      maxWidth: columns[4].width - 6,
    });
    page.drawText(formatCurrency(item.lineTotal), {
      x: columns[5].x + 3,
      y: cursorY - 14,
      font: fontRegular,
      size: 9,
      color: textColor,
      maxWidth: columns[5].width - 6,
    });

    cursorY -= 20;
  }

  if (cursorY < 170) {
    addNewPage();
    drawHeader();
    cursorY = pageHeight - 180;
  }

  const summaryX = pageWidth - 230;
  const summaryWidth = 198;
  const summaryLine = (label: string, value: string, y: number, bold = false) => {
    page.drawText(label, {
      x: summaryX,
      y,
      font: bold ? fontBold : fontRegular,
      size: 10,
      color: textColor,
    });
    page.drawText(value, {
      x: summaryX + 102,
      y,
      font: bold ? fontBold : fontRegular,
      size: 10,
      color: textColor,
      maxWidth: summaryWidth - 102,
    });
  };

  page.drawRectangle({
    x: summaryX - 10,
    y: cursorY - 78,
    width: summaryWidth + 12,
    height: 82,
    borderColor: rgb(0.7, 0.76, 0.83),
    borderWidth: 0.9,
  });
  summaryLine('Subtotal', formatCurrency(details.subtotal), cursorY - 14);
  summaryLine('GST Total', formatCurrency(details.gstTotal), cursorY - 30);
  summaryLine('Amount Paid', formatCurrency(details.amountPaid), cursorY - 46);
  summaryLine('Balance Due', formatCurrency(details.balanceDue), cursorY - 62);
  summaryLine('Grand Total', formatCurrency(details.total), cursorY - 78, true);

  if (details.notes && details.notes.trim().length > 0) {
    page.drawText('Notes', {
      x: marginX,
      y: cursorY - 18,
      font: fontBold,
      size: 10,
      color: primary,
    });
    page.drawText(details.notes, {
      x: marginX,
      y: cursorY - 34,
      font: fontRegular,
      size: 10,
      color: textColor,
      maxWidth: pageWidth - marginX * 2 - 230,
      lineHeight: 12,
    });
  }

  page.drawLine({
    start: { x: pageWidth - 230, y: 110 },
    end: { x: pageWidth - 36, y: 110 },
    thickness: 1,
    color: rgb(0.6, 0.6, 0.6),
  });
  page.drawText('Authorized Signature', {
    x: pageWidth - 165,
    y: 96,
    font: fontRegular,
    size: 10,
    color: rgb(0.35, 0.35, 0.35),
  });

  return document.save();
};

export class PdfService {
  public async generatePrescriptionPdf(input: GeneratePrescriptionPdfInput): Promise<GeneratedPdf> {
    const prescription = await prisma.prescription.findFirst({
      where: {
        id: input.prescriptionId,
        hospitalId: input.hospitalId,
      },
      select: {
        id: true,
        hospitalId: true,
        visitId: true,
        visit: {
          select: {
            visitedAt: true,
            chiefComplaint: true,
            diagnosis: true,
            prescriptions: {
              select: {
                medication: true,
                dosage: true,
                frequency: true,
                durationDays: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
            patient: {
              select: {
                name: true,
                mrn: true,
              },
            },
            doctor: {
              select: {
                name: true,
                specialization: true,
              },
            },
          },
        },
        hospital: {
          select: {
            name: true,
            address: true,
            licenseNo: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new Error('Prescription not found for PDF generation');
    }

    const pdfBytes = await createPrescriptionPdfBuffer({
      hospitalName: prescription.hospital.name,
      hospitalAddress: prescription.hospital.address,
      licenseNo: prescription.hospital.licenseNo,
      patientName: prescription.visit.patient.name,
      patientMrn: prescription.visit.patient.mrn,
      doctorName: prescription.visit.doctor.name,
      doctorSpecialization: prescription.visit.doctor.specialization ?? 'General Medicine',
      visitedAt: prescription.visit.visitedAt,
      prescriptionId: prescription.id,
      symptoms: prescription.visit.chiefComplaint,
      diagnosis: prescription.visit.diagnosis,
      prescriptions: prescription.visit.prescriptions,
    });

    const relativePath = path.join(
      'prescriptions',
      prescription.hospitalId,
      `${prescription.id}.pdf`
    );
    const absolutePath = path.join(getStorageRoot(), relativePath);
    const tempPath = absolutePath + '.tmp';
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    try {
      await fs.writeFile(tempPath, Buffer.from(pdfBytes));
      await fs.rename(tempPath, absolutePath);

      const normalizedRelativePath = relativePath.replace(/\\/g, '/');
      const pdfUrl = `${getPublicBaseUrl()}/uploads/${normalizedRelativePath}`;
      const generatedAt = new Date();

      await prisma.prescription.updateMany({
        where: {
          visitId: prescription.visitId,
          hospitalId: input.hospitalId,
        },
        data: {
          pdfPath: normalizedRelativePath,
          pdfUrl,
          pdfGeneratedAt: generatedAt,
        },
      });

      return {
        pdfPath: normalizedRelativePath,
        pdfUrl,
        generatedAt,
      };
    } catch (error) {
      await fs.unlink(tempPath).catch(() => {});
      await fs.unlink(absolutePath).catch(() => {});
      throw error;
    }
  }

  public async generateInvoicePdf(input: GenerateInvoicePdfInput): Promise<GeneratedPdf> {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: input.invoiceId,
        hospitalId: input.hospitalId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        createdAt: true,
        dueDate: true,
        notes: true,
        subtotal: true,
        gstTotal: true,
        total: true,
        amountPaid: true,
        hospitalId: true,
        patient: {
          select: {
            name: true,
            mrn: true,
            phone: true,
          },
        },
        visit: {
          select: {
            visitedAt: true,
            doctor: {
              select: {
                name: true,
                specialization: true,
              },
            },
          },
        },
        hospital: {
          select: {
            name: true,
            address: true,
            licenseNo: true,
          },
        },
        items: {
          select: {
            description: true,
            quantity: true,
            unitPrice: true,
            gstRate: true,
            lineSubtotal: true,
            lineGst: true,
            lineTotal: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found for PDF generation');
    }

    const balanceDue = invoice.total.minus(invoice.amountPaid);
    const pdfBytes = await createInvoicePdfBuffer({
      hospitalName: invoice.hospital.name,
      hospitalAddress: invoice.hospital.address,
      licenseNo: invoice.hospital.licenseNo,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.createdAt,
      dueDate: invoice.dueDate,
      patientName: invoice.patient.name,
      patientMrn: invoice.patient.mrn,
      patientPhone: invoice.patient.phone,
      doctorName: invoice.visit?.doctor.name ?? null,
      doctorSpecialization: invoice.visit?.doctor.specialization ?? null,
      visitDate: invoice.visit?.visitedAt ?? null,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        gstRate: item.gstRate.toString(),
        lineSubtotal: item.lineSubtotal.toString(),
        lineGst: item.lineGst.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
      subtotal: invoice.subtotal.toString(),
      gstTotal: invoice.gstTotal.toString(),
      total: invoice.total.toString(),
      amountPaid: invoice.amountPaid.toString(),
      balanceDue: balanceDue.toString(),
      notes: invoice.notes,
    });

    const relativePath = path.join('invoices', invoice.hospitalId, `${invoice.id}.pdf`);
    const absolutePath = path.join(getStorageRoot(), relativePath);
    const tempPath = absolutePath + '.tmp';
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    try {
      await fs.writeFile(tempPath, Buffer.from(pdfBytes));
      await fs.rename(tempPath, absolutePath);

      const normalizedRelativePath = relativePath.replace(/\\/g, '/');
      const pdfUrl = `${getPublicBaseUrl()}/uploads/${normalizedRelativePath}`;
      const generatedAt = new Date();

      await prisma.$executeRaw`
        UPDATE "Invoice"
        SET
          "pdfPath" = ${normalizedRelativePath},
          "pdfUrl" = ${pdfUrl},
          "pdfGeneratedAt" = ${generatedAt},
          "updatedAt" = NOW()
        WHERE "id" = ${invoice.id}
      `;

      return {
        pdfPath: normalizedRelativePath,
        pdfUrl,
        generatedAt,
      };
    } catch (error) {
      await fs.unlink(tempPath).catch(() => {});
      await fs.unlink(absolutePath).catch(() => {});
      throw error;
    }
  }
}

export const pdfService = new PdfService();
