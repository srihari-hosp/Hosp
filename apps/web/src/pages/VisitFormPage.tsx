import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { pdf } from "@react-pdf/renderer";
import { PrescriptionPDF, PrescriptionSection, type MedicationRow } from "../components/prescriptions";
import {
  useAddVisitPrescriptionMutation,
  useCreateVisitMutation,
  useGetVisitByAppointmentQuery,
  useGetAppointmentsQuery,
  useLazyGetQueueJobStatusQuery,
  type Appointment,
} from "../store/api";
import { useAppSelector } from "../store/hooks";

const createMedicationRow = (): MedicationRow => ({
  id: `row-${crypto.randomUUID()}`,
  medication: "",
  dosage: "",
  frequency: "",
  durationDays: "",
});

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const parseApiError = (error: unknown): string => {
  if (!error || typeof error !== "object") {
    return "Unable to process request.";
  }

  const parsed = error as {
    status?: unknown;
    data?: {
      message?: string;
      error?: string;
    };
  };

  if (parsed.status === "FETCH_ERROR") {
    return "Unable to connect to API server.";
  }

  return parsed.data?.message ?? parsed.data?.error ?? "Unable to process request.";
};

const validateMedications = (rows: MedicationRow[]): string | null => {
  for (const row of rows) {
    if (!row.medication.trim() || !row.dosage.trim() || !row.frequency.trim()) {
      return "Medication name, dosage and frequency are required for each row.";
    }

    const duration = Number(row.durationDays);
    if (!Number.isInteger(duration) || duration < 1) {
      return "Duration must be a positive number for each medication.";
    }
  }

  return null;
};

const findAppointment = (appointments: Appointment[], appointmentId?: string): Appointment | null => {
  if (!appointmentId) {
    return null;
  }
  return appointments.find((entry) => entry.id === appointmentId) ?? null;
};

export const VisitFormPage = () => {
  const navigate = useNavigate();
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const tenant = useAppSelector((state) => state.tenant.currentTenant);

  const { data: appointments = [], isLoading: isLoadingAppointments } = useGetAppointmentsQuery();
  const {
    data: existingVisit,
    isFetching: isLoadingExistingVisit,
    refetch: refetchExistingVisit,
  } = useGetVisitByAppointmentQuery(appointmentId ?? "", {
    skip: !appointmentId,
  });
  const appointment = useMemo(
    () => findAppointment(appointments, appointmentId),
    [appointments, appointmentId]
  );

  const [createVisit, { isLoading: isCreatingVisit }] = useCreateVisitMutation();
  const [addVisitPrescription] = useAddVisitPrescriptionMutation();
  const [getQueueJobStatus] = useLazyGetQueueJobStatusQuery();

  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [visitId, setVisitId] = useState<string | null>(null);
  const [visitDate, setVisitDate] = useState<string | null>(null);
  const [medicationRows, setMedicationRows] = useState<MedicationRow[]>([createMedicationRow()]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [prescriptionDirty, setPrescriptionDirty] = useState(true);
  const [lastPdfUrl, setLastPdfUrl] = useState<string | null>(null);

  const isVisitCompleted = Boolean(visitId);

  useEffect(() => {
    if (!existingVisit) {
      return;
    }

    setVisitId(existingVisit.id);
    setVisitDate(existingVisit.visitedAt);
    setSymptoms(existingVisit.chiefComplaint ?? "");
    setDiagnosis(existingVisit.diagnosis ?? "");
    setNotes(existingVisit.notes ?? "");

    if (existingVisit.prescriptions.length > 0) {
      setMedicationRows(
        existingVisit.prescriptions.map((entry) => ({
          id: `row-${entry.id}`,
          medication: entry.medication,
          dosage: entry.dosage,
          frequency: entry.frequency,
          durationDays: String(entry.durationDays),
        }))
      );
      setPrescriptionDirty(false);
      const existingPdfUrl = existingVisit.prescriptions.find((entry) => entry.pdfUrl)?.pdfUrl ?? null;
      setLastPdfUrl(existingPdfUrl);
    }
  }, [existingVisit]);

  const handleCreateVisit = async () => {
    if (!appointmentId) {
      setErrorText("Appointment ID is missing.");
      return;
    }
    if (!symptoms.trim() || !diagnosis.trim()) {
      setErrorText("Symptoms and diagnosis are required.");
      return;
    }
    if (existingVisit) {
      setVisitId(existingVisit.id);
      setVisitDate(existingVisit.visitedAt);
      setSuccessText("Visit already exists for this appointment.");
      setErrorText(null);
      return;
    }

    try {
      setErrorText(null);
      const response = await createVisit({
        appointmentId,
        chiefComplaint: symptoms.trim(),
        diagnosis: diagnosis.trim(),
        notes: notes.trim() || undefined,
      }).unwrap();

      setVisitId(response.visit.id);
      setVisitDate(response.visit.visitedAt);
      setSuccessText("Visit completed and appointment marked as completed.");
    } catch (error) {
      const parsed = error as { status?: unknown };
      if (parsed.status === 409) {
        const latest = await refetchExistingVisit();
        if (latest.data) {
          setVisitId(latest.data.id);
          setVisitDate(latest.data.visitedAt);
          setSuccessText("Visit already exists for this appointment.");
          setErrorText(null);
          return;
        }
      }
      setErrorText(parseApiError(error));
    }
  };

  const handleAddMedicationRow = () => {
    setMedicationRows((prev) => [...prev, createMedicationRow()]);
    setPrescriptionDirty(true);
  };

  const handleRemoveMedicationRow = (rowId: string) => {
    setMedicationRows((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((row) => row.id !== rowId);
    });
    setPrescriptionDirty(true);
  };

  const handleChangeMedicationRow = (
    rowId: string,
    field: keyof Omit<MedicationRow, "id">,
    value: string
  ) => {
    setMedicationRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
    setPrescriptionDirty(true);
  };

  const openClientGeneratedPdf = async (pdfWindow?: Window | null) => {
    if (!appointment) {
      if (pdfWindow) pdfWindow.close();
      return;
    }

    const doc = (
      <PrescriptionPDF
        hospitalName={tenant?.name ?? "Hospital"}
        hospitalAddress={tenant?.address ?? ""}
        patientName={appointment.patient.name}
        patientMrn={appointment.patient.mrn}
        doctorName={appointment.doctor.name}
        doctorSpecialization={appointment.doctor.specialization}
        visitDate={new Date(visitDate ?? new Date().toISOString()).toLocaleString()}
        diagnosis={diagnosis}
        symptoms={symptoms}
        medications={medicationRows}
      />
    );

    const blob = await pdf(doc).toBlob();
    const blobUrl = URL.createObjectURL(blob);
    if (pdfWindow) {
      pdfWindow.location.href = blobUrl;
    } else {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    }
  };

  const waitForQueuedPdf = async (jobId: string): Promise<string | null> => {
    const maxAttempts = 30;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await getQueueJobStatus(
        {
          queue: "pdf-generation",
          jobId,
        },
        true
      ).unwrap();

      if (response.job?.state === "completed") {
        return response.job.returnvalue?.pdfUrl ?? null;
      }

      if (response.job?.state === "failed") {
        throw new Error(response.job.failedReason ?? "PDF generation failed.");
      }

      await sleep(2000);
    }

    return null;
  };

  const handlePrintPrescription = async () => {
    if (!isVisitCompleted || !visitId) {
      setErrorText("Complete the visit first before printing prescription.");
      return;
    }

    const medicationValidationError = validateMedications(medicationRows);
    if (medicationValidationError) {
      setErrorText(medicationValidationError);
      return;
    }

    const pdfWindow = window.open("about:blank", "_blank", "noopener,noreferrer");

    if (!prescriptionDirty) {
      if (lastPdfUrl) {
        if (pdfWindow) pdfWindow.location.href = lastPdfUrl;
      } else {
        await openClientGeneratedPdf(pdfWindow);
      }
      return;
    }

    try {
      setErrorText(null);
      setSuccessText(null);
      setIsPrinting(true);

      let lastJobId = "";
      for (const row of medicationRows) {
        const response = await addVisitPrescription({
          visitId,
          medication: row.medication.trim(),
          dosage: row.dosage.trim(),
          frequency: row.frequency.trim(),
          durationDays: Number(row.durationDays),
        }).unwrap();
        lastJobId = response.jobId;
      }

      const generatedPdfUrl = lastJobId ? await waitForQueuedPdf(lastJobId) : null;
      if (generatedPdfUrl) {
        setLastPdfUrl(generatedPdfUrl);
        setPrescriptionDirty(false);
        setSuccessText("Prescription PDF generated.");
        if (pdfWindow) {
          pdfWindow.location.href = generatedPdfUrl;
        }
        return;
      }

      setSuccessText("PDF queue timed out. Opened client-generated PDF.");
      await openClientGeneratedPdf(pdfWindow);
    } catch (error) {
      if (pdfWindow) pdfWindow.close();
      setErrorText(parseApiError(error));
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoadingAppointments || isLoadingExistingVisit) {
    return <Typography>Loading appointment...</Typography>;
  }

  if (!appointment) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">Appointment not found. Go back to appointments and retry.</Alert>
        <Box>
          <Button variant="outlined" onClick={() => navigate("/appointments")}>
            Back to Appointments
          </Button>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5">OPD Visit Form</Typography>
        <Typography color="text.secondary">
          Complete visit details and generate prescription PDF for the patient.
        </Typography>
      </Box>

      {errorText ? <Alert severity="error">{errorText}</Alert> : null}
      {successText ? <Alert severity="success">{successText}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="h6">Appointment Details</Typography>
          <Typography>
            <strong>Patient:</strong> {appointment.patient.name} ({appointment.patient.mrn})
          </Typography>
          <Typography>
            <strong>Doctor:</strong> {appointment.doctor.name}
            {appointment.doctor.specialization ? ` - ${appointment.doctor.specialization}` : ""}
          </Typography>
          <Typography>
            <strong>Scheduled:</strong> {new Date(appointment.scheduledAt).toLocaleString()}
          </Typography>
          <Typography>
            <strong>Status:</strong> {appointment.status}
          </Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Visit Notes</Typography>
          <TextField
            label="Symptoms"
            value={symptoms}
            onChange={(event) => setSymptoms(event.target.value)}
            required
            multiline
            minRows={3}
            disabled={isVisitCompleted}
          />
          <TextField
            label="Diagnosis"
            value={diagnosis}
            onChange={(event) => setDiagnosis(event.target.value)}
            required
            multiline
            minRows={3}
            disabled={isVisitCompleted}
          />
          <TextField
            label="Notes (Optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={2}
            disabled={isVisitCompleted}
          />
          <Box>
            <Button
              variant="contained"
              onClick={handleCreateVisit}
              disabled={isVisitCompleted || isCreatingVisit}
            >
              {isCreatingVisit ? "Submitting..." : "Create Visit"}
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <PrescriptionSection
            rows={medicationRows}
            disabled={isPrinting}
            onAddMedication={handleAddMedicationRow}
            onRemoveMedication={handleRemoveMedicationRow}
            onChangeMedication={handleChangeMedicationRow}
          />
          <Box>
            <Button
              variant="contained"
              onClick={handlePrintPrescription}
              disabled={isPrinting || !isVisitCompleted}
              startIcon={isPrinting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {isPrinting ? "Generating PDF..." : "Print Prescription"}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
};
