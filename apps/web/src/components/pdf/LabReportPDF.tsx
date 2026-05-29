import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { LabOrderRecord } from "../../store/api";

type LabReportPDFProps = {
  hospitalName: string;
  hospitalAddress: string;
  order: LabOrderRecord;
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: "#111827",
  },
  header: {
    backgroundColor: "#0f4c3a",
    borderRadius: 4,
    color: "#fff",
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 8,
  },
  sectionTitle: {
    fontSize: 11,
    color: "#0f4c3a",
    fontWeight: 700,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 86,
    fontWeight: 700,
  },
  value: {
    flex: 1,
  },
  resultPanel: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 10,
    marginTop: 6,
  },
  footer: {
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    color: "#6b7280",
    fontSize: 9,
  },
});

const toDateTime = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const LabReportPDF = ({ hospitalName, hospitalAddress, order }: LabReportPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hospitalName}>{hospitalName}</Text>
          <Text>{hospitalAddress}</Text>
        </View>
        <View>
          <Text style={styles.title}>Lab Report</Text>
          <Text>{order.orderNumber}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Patient</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{order.patient.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>MRN</Text>
            <Text style={styles.value}>{order.patient.mrn}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Age/Gender</Text>
            <Text style={styles.value}>{`${order.patient.age} / ${order.patient.gender}`}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Doctor</Text>
            <Text style={styles.value}>{order.doctor.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Priority</Text>
            <Text style={styles.value}>{order.priority}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{order.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Ordered At</Text>
            <Text style={styles.value}>{toDateTime(order.orderedAt)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Test Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Test</Text>
          <Text style={styles.value}>{order.labTest.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Code</Text>
          <Text style={styles.value}>{order.labTest.code}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Sample</Text>
          <Text style={styles.value}>{order.labTest.sampleType ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Clinical</Text>
          <Text style={styles.value}>{order.clinicalNotes ?? "-"}</Text>
        </View>
      </View>

      <View style={styles.resultPanel}>
        <Text style={styles.sectionTitle}>Result</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Value</Text>
          <Text style={styles.value}>{order.result?.resultValue ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Unit</Text>
          <Text style={styles.value}>{order.result?.unit ?? order.labTest.defaultUnit ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reference</Text>
          <Text style={styles.value}>{order.result?.referenceRange ?? order.labTest.referenceRange ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Interpretation</Text>
          <Text style={styles.value}>{order.result?.interpretation ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Observed</Text>
          <Text style={styles.value}>{toDateTime(order.result?.observedAt)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reported</Text>
          <Text style={styles.value}>{toDateTime(order.result?.reportedAt)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Remarks</Text>
          <Text style={styles.value}>{order.result?.remarks ?? "-"}</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        Generated from HOSP Lab UI. This report should be interpreted by a qualified clinician.
      </Text>
    </Page>
  </Document>
);
