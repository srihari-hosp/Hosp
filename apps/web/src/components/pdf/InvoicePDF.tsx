import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoiceRecord } from "../../store/api";

type InvoicePdfProps = {
  hospitalName: string;
  hospitalAddress: string;
  invoice: InvoiceRecord;
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: "#111827",
  },
  letterhead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#0b3b7b",
    color: "#ffffff",
    padding: 14,
    borderRadius: 4,
    marginBottom: 14,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
  },
  sectionTitle: {
    marginTop: 6,
    marginBottom: 6,
    fontSize: 11,
    color: "#0b3b7b",
    fontWeight: 700,
  },
  grid: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 8,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 8,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 72,
    fontWeight: 700,
  },
  value: {
    flex: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  cDesc: {
    width: "36%",
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
  },
  cQty: {
    width: "8%",
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
  },
  cUnit: {
    width: "16%",
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
  },
  cGst: {
    width: "12%",
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
  },
  cLine: {
    width: "28%",
    padding: 6,
  },
  totals: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: 220,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  grand: {
    fontWeight: 700,
    marginTop: 4,
  },
});

const toCurrency = (value: string): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(numeric);
};

const toDate = (value?: string | null): string => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
};

const toBalance = (invoice: InvoiceRecord): string => {
  const total = Number(invoice.total);
  const paid = Number(invoice.amountPaid);
  if (!Number.isFinite(total) || !Number.isFinite(paid)) {
    return "0";
  }
  return Math.max(total - paid, 0).toFixed(2);
};

export const InvoicePDF = ({ hospitalName, hospitalAddress, invoice }: InvoicePdfProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.letterhead}>
        <View>
          <Text style={styles.hospitalName}>{hospitalName}</Text>
          <Text>{hospitalAddress}</Text>
        </View>
        <Text style={styles.title}>Invoice</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Number</Text>
            <Text style={styles.value}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Issued</Text>
            <Text style={styles.value}>{toDate(invoice.createdAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Due</Text>
            <Text style={styles.value}>{toDate(invoice.dueDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{invoice.status}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Patient</Text>
            <Text style={styles.value}>{invoice.patient.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>MRN</Text>
            <Text style={styles.value}>{invoice.patient.mrn}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{invoice.patient.phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Doctor</Text>
            <Text style={styles.value}>{invoice.visit?.doctor.name ?? "-"}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Line Items</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.cDesc}>Description</Text>
          <Text style={styles.cQty}>Qty</Text>
          <Text style={styles.cUnit}>Unit Price</Text>
          <Text style={styles.cGst}>GST</Text>
          <Text style={styles.cLine}>Line Total</Text>
        </View>
        {invoice.items.map((item) => (
          <View style={styles.tableRow} key={item.id}>
            <Text style={styles.cDesc}>{item.description}</Text>
            <Text style={styles.cQty}>{item.quantity}</Text>
            <Text style={styles.cUnit}>{toCurrency(item.unitPrice)}</Text>
            <Text style={styles.cGst}>
              {item.gstRate}% ({toCurrency(item.lineGst)})
            </Text>
            <Text style={styles.cLine}>{toCurrency(item.lineTotal)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text>Subtotal</Text>
          <Text>{toCurrency(invoice.subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text>GST Total</Text>
          <Text>{toCurrency(invoice.gstTotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text>Amount Paid</Text>
          <Text>{toCurrency(invoice.amountPaid)}</Text>
        </View>
        <View style={[styles.totalRow, styles.grand]}>
          <Text>Balance Due</Text>
          <Text>{toCurrency(toBalance(invoice))}</Text>
        </View>
        <View style={[styles.totalRow, styles.grand]}>
          <Text>Grand Total</Text>
          <Text>{toCurrency(invoice.total)}</Text>
        </View>
      </View>
    </Page>
  </Document>
);
