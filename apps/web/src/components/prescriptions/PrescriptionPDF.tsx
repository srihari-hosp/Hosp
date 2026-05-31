import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { MedicationRow } from "./PrescriptionSection";

type PrescriptionPDFProps = {
  hospitalName: string;
  hospitalAddress: string;
  patientName: string;
  patientMrn: string;
  doctorName: string;
  doctorSpecialization?: string | null;
  visitDate: string;
  diagnosis: string;
  symptoms: string;
  medications: MedicationRow[];
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    color: "#0f172a",
  },
  letterhead: {
    backgroundColor: "#0b3b7b",
    color: "#ffffff",
    padding: 14,
    borderRadius: 4,
    marginBottom: 18,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0b3b7b",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    width: 140,
    fontWeight: 700,
  },
  value: {
    flex: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  cellName: {
    flex: 3,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  cellSmall: {
    flex: 2,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  cellSmallLast: {
    flex: 1.5,
    padding: 6,
  },
  signatureWrap: {
    marginTop: 46,
    alignItems: "flex-end",
  },
  signatureLine: {
    width: 180,
    borderTopWidth: 1,
    borderTopColor: "#64748b",
    marginBottom: 6,
  },
});

export const PrescriptionPDF = ({
  hospitalName,
  hospitalAddress,
  patientName,
  patientMrn,
  doctorName,
  doctorSpecialization,
  visitDate,
  diagnosis,
  symptoms,
  medications,
}: PrescriptionPDFProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.letterhead}>
          <Text style={styles.hospitalName}>{hospitalName}</Text>
          <Text>{hospitalAddress}</Text>
        </View>

        <Text style={styles.title}>Prescription</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Patient</Text>
          <Text style={styles.value}>
            {patientName} ({patientMrn})
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Doctor</Text>
          <Text style={styles.value}>
            {doctorName}
            {doctorSpecialization ? ` (${doctorSpecialization})` : ""}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date of Visit</Text>
          <Text style={styles.value}>{visitDate}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Symptoms</Text>
          <Text style={styles.value}>{symptoms}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Diagnosis</Text>
          <Text style={styles.value}>{diagnosis}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellName}>Medication</Text>
            <Text style={styles.cellSmall}>Dosage</Text>
            <Text style={styles.cellSmall}>Frequency</Text>
            <Text style={styles.cellSmallLast}>Duration</Text>
          </View>
          {medications.map((row) => (
            <View style={styles.tableRow} key={row.id}>
              <Text style={styles.cellName}>{row.medication}</Text>
              <Text style={styles.cellSmall}>{row.dosage}</Text>
              <Text style={styles.cellSmall}>{row.frequency}</Text>
              <Text style={styles.cellSmallLast}>{row.durationDays} day(s)</Text>
            </View>
          ))}
        </View>

        <View style={styles.signatureWrap}>
          <View style={styles.signatureLine} />
          <Text>Doctor Signature</Text>
        </View>
      </Page>
    </Document>
  );
};
