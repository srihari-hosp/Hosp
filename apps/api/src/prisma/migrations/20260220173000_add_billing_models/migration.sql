-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN
    CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI', 'NET_BANKING', 'WALLET', 'OTHER');
  END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TariffItem" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "hospitalId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TariffItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "invoiceYear" INTEGER NOT NULL,
  "invoiceMonth" INTEGER NOT NULL,
  "invoiceSeq" INTEGER NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
  "subtotal" DECIMAL(12,2) NOT NULL,
  "gstTotal" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "dueDate" TIMESTAMP(3),
  "notes" TEXT,
  "hospitalId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InvoiceItem" (
  "id" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "gstRate" DECIMAL(5,2) NOT NULL,
  "lineSubtotal" DECIMAL(12,2) NOT NULL,
  "lineGst" DECIMAL(12,2) NOT NULL,
  "lineTotal" DECIMAL(12,2) NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "tariffItemId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "referenceNo" TEXT,
  "notes" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "hospitalId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TariffItem_hospitalId_idx" ON "TariffItem"("hospitalId");
CREATE INDEX IF NOT EXISTS "TariffItem_hospitalId_name_idx" ON "TariffItem"("hospitalId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "TariffItem_hospitalId_code_key" ON "TariffItem"("hospitalId", "code");

CREATE INDEX IF NOT EXISTS "Invoice_hospitalId_idx" ON "Invoice"("hospitalId");
CREATE INDEX IF NOT EXISTS "Invoice_hospitalId_status_idx" ON "Invoice"("hospitalId", "status");
CREATE INDEX IF NOT EXISTS "Invoice_hospitalId_patientId_idx" ON "Invoice"("hospitalId", "patientId");
CREATE INDEX IF NOT EXISTS "Invoice_hospitalId_createdAt_idx" ON "Invoice"("hospitalId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_hospitalId_invoiceNumber_key" ON "Invoice"("hospitalId", "invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_hospitalId_invoiceYear_invoiceMonth_invoiceSeq_key"
  ON "Invoice"("hospitalId", "invoiceYear", "invoiceMonth", "invoiceSeq");

CREATE INDEX IF NOT EXISTS "InvoiceItem_hospitalId_idx" ON "InvoiceItem"("hospitalId");
CREATE INDEX IF NOT EXISTS "InvoiceItem_hospitalId_invoiceId_idx" ON "InvoiceItem"("hospitalId", "invoiceId");

CREATE INDEX IF NOT EXISTS "Payment_hospitalId_idx" ON "Payment"("hospitalId");
CREATE INDEX IF NOT EXISTS "Payment_hospitalId_invoiceId_idx" ON "Payment"("hospitalId", "invoiceId");
CREATE INDEX IF NOT EXISTS "Payment_hospitalId_patientId_idx" ON "Payment"("hospitalId", "patientId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TariffItem_hospitalId_fkey') THEN
    ALTER TABLE "TariffItem"
      ADD CONSTRAINT "TariffItem_hospitalId_fkey"
      FOREIGN KEY ("hospitalId")
      REFERENCES "Hospital"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_hospitalId_fkey') THEN
    ALTER TABLE "Invoice"
      ADD CONSTRAINT "Invoice_hospitalId_fkey"
      FOREIGN KEY ("hospitalId")
      REFERENCES "Hospital"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_patientId_fkey') THEN
    ALTER TABLE "Invoice"
      ADD CONSTRAINT "Invoice_patientId_fkey"
      FOREIGN KEY ("patientId")
      REFERENCES "Patient"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_visitId_fkey') THEN
    ALTER TABLE "Invoice"
      ADD CONSTRAINT "Invoice_visitId_fkey"
      FOREIGN KEY ("visitId")
      REFERENCES "Visit"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceItem_hospitalId_fkey') THEN
    ALTER TABLE "InvoiceItem"
      ADD CONSTRAINT "InvoiceItem_hospitalId_fkey"
      FOREIGN KEY ("hospitalId")
      REFERENCES "Hospital"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceItem_invoiceId_fkey') THEN
    ALTER TABLE "InvoiceItem"
      ADD CONSTRAINT "InvoiceItem_invoiceId_fkey"
      FOREIGN KEY ("invoiceId")
      REFERENCES "Invoice"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceItem_tariffItemId_fkey') THEN
    ALTER TABLE "InvoiceItem"
      ADD CONSTRAINT "InvoiceItem_tariffItemId_fkey"
      FOREIGN KEY ("tariffItemId")
      REFERENCES "TariffItem"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_hospitalId_fkey') THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_hospitalId_fkey"
      FOREIGN KEY ("hospitalId")
      REFERENCES "Hospital"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_patientId_fkey') THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_patientId_fkey"
      FOREIGN KEY ("patientId")
      REFERENCES "Patient"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_invoiceId_fkey') THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_invoiceId_fkey"
      FOREIGN KEY ("invoiceId")
      REFERENCES "Invoice"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;
