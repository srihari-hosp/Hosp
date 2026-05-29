import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  useDispenseMedicineMutation,
  useGetAppointmentsQuery,
  useGetMedicineBatchesQuery,
  useGetVisitByAppointmentQuery,
  type MedicineRecord,
  type StockBatchRecord,
  type VisitPrescription,
} from "../../store/api";

type DispenseFromPrescriptionModalProps = {
  open: boolean;
  medicines: MedicineRecord[];
  onClose: () => void;
  onDispensed?: () => void;
  defaultMedicineId?: string | null;
};

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

const toDate = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
};

const getFefoBatch = (batches: StockBatchRecord[]): StockBatchRecord | null => {
  const now = new Date();
  const valid = batches
    .filter((batch) => batch.isActive && batch.availableQty > 0 && new Date(batch.expiryDate) >= now)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  return valid[0] ?? null;
};

const findSuggestedMedicine = (prescription: VisitPrescription, medicines: MedicineRecord[]): MedicineRecord | null => {
  const medicationText = prescription.medication.trim().toLowerCase();
  if (!medicationText) {
    return null;
  }
  return (
    medicines.find((medicine) => medicationText.includes(medicine.name.toLowerCase())) ??
    medicines.find((medicine) => medicationText.includes(medicine.code.toLowerCase())) ??
    medicines.find((medicine) => {
      const generic = medicine.genericName?.toLowerCase().trim();
      return generic ? medicationText.includes(generic) : false;
    }) ??
    null
  );
};

export const DispenseFromPrescriptionModal = ({
  open,
  medicines,
  onClose,
  onDispensed,
  defaultMedicineId,
}: DispenseFromPrescriptionModalProps) => {
  const [appointmentId, setAppointmentId] = useState("");
  const [prescriptionId, setPrescriptionId] = useState("");
  const [medicineId, setMedicineId] = useState(defaultMedicineId ?? "");
  const [quantity, setQuantity] = useState("1");
  const [stockBatchId, setStockBatchId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  const { data: appointments = [] } = useGetAppointmentsQuery();
  const { data: visitData } = useGetVisitByAppointmentQuery(appointmentId, {
    skip: !appointmentId,
  });
  const { data: batches = [], isFetching: isLoadingBatches } = useGetMedicineBatchesQuery(
    { medicineId, includeExpired: true },
    { skip: !medicineId }
  );
  const [dispenseMedicine, { isLoading: isDispensing }] = useDispenseMedicineMutation();

  const prescriptions = visitData?.prescriptions ?? [];
  const selectedPrescription = prescriptions.find((record) => record.id === prescriptionId) ?? null;

  const validFefoBatch = useMemo(() => getFefoBatch(batches), [batches]);
  const eligibleBatches = useMemo(() => {
    const now = new Date();
    return batches.filter((batch) => batch.isActive && batch.availableQty > 0 && new Date(batch.expiryDate) >= now);
  }, [batches]);

  const selectedBatch = eligibleBatches.find((entry) => entry.id === stockBatchId) ?? null;
  const quantityValue = Number(quantity);
  const isQuantityValid =
    Number.isInteger(quantityValue) &&
    quantityValue > 0 &&
    (selectedBatch ? quantityValue <= selectedBatch.availableQty : true);
  const isFormValid = Boolean(appointmentId && prescriptionId && medicineId && stockBatchId && isQuantityValid);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (defaultMedicineId) {
      setMedicineId(defaultMedicineId);
    }
  }, [defaultMedicineId, open]);

  useEffect(() => {
    if (!selectedPrescription) {
      return;
    }
    const suggested = findSuggestedMedicine(selectedPrescription, medicines);
    if (suggested?.id) {
      setMedicineId(suggested.id);
    }
  }, [medicines, selectedPrescription]);

  useEffect(() => {
    const nextFefo = getFefoBatch(batches);
    if (nextFefo) {
      setStockBatchId(nextFefo.id);
      return;
    }
    setStockBatchId("");
  }, [batches, medicineId]);

  const handleClose = () => {
    if (isDispensing) return;
    setAppointmentId("");
    setPrescriptionId("");
    setMedicineId(defaultMedicineId ?? "");
    setQuantity("1");
    setStockBatchId("");
    setNotes("");
    setSubmitAttempted(false);
    setErrorText(null);
    setSuccessText(null);
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    setErrorText(null);
    setSuccessText(null);
    if (!isFormValid) {
      return;
    }
    try {
      const response = await dispenseMedicine({
        prescriptionId,
        medicineId,
        stockBatchId,
        quantity: quantityValue,
        notes: notes.trim() || undefined,
      }).unwrap();
      setSuccessText(response.message ?? "Medicine dispensed successfully.");
      onDispensed?.();
    } catch (error) {
      setErrorText(parseApiError(error));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Dispense From Prescription</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {errorText ? <Alert severity="error">{errorText}</Alert> : null}
          {successText ? <Alert severity="success">{successText}</Alert> : null}

          <TextField
            select
            label="Appointment"
            value={appointmentId}
            onChange={(event) => {
              setAppointmentId(event.target.value);
              setPrescriptionId("");
              setErrorText(null);
              setSuccessText(null);
            }}
            fullWidth
          >
            {appointments.map((appointment) => (
              <MenuItem key={appointment.id} value={appointment.id}>
                {appointment.patient.name} ({appointment.patient.mrn}) -{" "}
                {new Date(appointment.scheduledAt).toLocaleString()}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Prescription"
            value={prescriptionId}
            onChange={(event) => {
              setPrescriptionId(event.target.value);
              setErrorText(null);
              setSuccessText(null);
            }}
            disabled={!appointmentId || prescriptions.length === 0}
            error={submitAttempted && !prescriptionId}
            helperText={
              !appointmentId
                ? "Select appointment first."
                : prescriptions.length === 0
                  ? "No prescriptions found for selected appointment visit."
                  : submitAttempted && !prescriptionId
                    ? "Select a prescription."
                    : ""
            }
            fullWidth
          >
            {prescriptions.map((record) => (
              <MenuItem key={record.id} value={record.id}>
                {record.medication} - {record.dosage}, {record.frequency} ({record.durationDays} days)
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Medicine"
            value={medicineId}
            onChange={(event) => {
              setMedicineId(event.target.value);
              setErrorText(null);
              setSuccessText(null);
            }}
            error={submitAttempted && !medicineId}
            helperText={submitAttempted && !medicineId ? "Select a medicine." : ""}
            fullWidth
          >
            {medicines.map((medicine) => (
              <MenuItem key={medicine.id} value={medicine.id}>
                {medicine.name} ({medicine.code})
              </MenuItem>
            ))}
          </TextField>

          {validFefoBatch ? (
            <Alert severity="info">
              FEFO batch selected: <strong>{validFefoBatch.batchNo}</strong> (exp {toDate(validFefoBatch.expiryDate)})
            </Alert>
          ) : (
            <Alert severity="warning">
              No non-expired batch with available stock found for this medicine. Dispense is blocked.
            </Alert>
          )}

          <TextField
            select
            label="Batch (FEFO order)"
            value={stockBatchId}
            onChange={(event) => setStockBatchId(event.target.value)}
            disabled={!medicineId || isLoadingBatches || eligibleBatches.length === 0}
            error={submitAttempted && !stockBatchId}
            helperText={submitAttempted && !stockBatchId ? "Select a valid batch." : ""}
            fullWidth
          >
            {eligibleBatches
              .slice()
              .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
              .map((batch) => (
                <MenuItem key={batch.id} value={batch.id}>
                  {batch.batchNo} | exp {toDate(batch.expiryDate)} | available {batch.availableQty}
                </MenuItem>
              ))}
          </TextField>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              type="number"
              label="Dispense Quantity"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              inputProps={{ min: 1, step: 1 }}
              error={submitAttempted && !isQuantityValid}
              helperText={
                submitAttempted && !isQuantityValid
                  ? `Enter whole number > 0${selectedBatch ? ` and <= ${selectedBatch.availableQty}` : ""}.`
                  : ""
              }
              fullWidth
            />
            <TextField
              label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              fullWidth
            />
          </Stack>

          {selectedPrescription ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Selected Prescription Details
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Medication</TableCell>
                    <TableCell>Dosage</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Duration</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>{selectedPrescription.medication}</TableCell>
                    <TableCell>{selectedPrescription.dosage}</TableCell>
                    <TableCell>{selectedPrescription.frequency}</TableCell>
                    <TableCell>
                      <Chip size="small" label={`${selectedPrescription.durationDays} days`} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isDispensing}>
          Close
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={isDispensing || !isFormValid}>
          {isDispensing ? "Dispensing..." : "Dispense"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
