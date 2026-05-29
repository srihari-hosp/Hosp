import { useEffect, useState } from "react";
import { Alert, Box, Button, Divider, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import type { LabOrderRecord } from "../../store/api";

type LabResultSubmitPayload = {
  collectedAt?: string;
  resultValue?: string;
  unit?: string;
  referenceRange?: string;
  interpretation?: string;
  remarks?: string;
  status?: "DRAFT" | "FINAL" | "CORRECTED";
  observedAt?: string;
  reportedAt?: string;
};

type LabResultEntryFormProps = {
  order: LabOrderRecord | null;
  isSubmitting?: boolean;
  onSubmit: (payload: LabResultSubmitPayload) => Promise<void>;
};

const toLocalDateTimeInput = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const fromLocalDateTimeInput = (value: string): string | undefined => {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

export const LabResultEntryForm = ({ order, isSubmitting = false, onSubmit }: LabResultEntryFormProps) => {
  const [resultValue, setResultValue] = useState("");
  const [unit, setUnit] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [observedAt, setObservedAt] = useState("");
  const [reportedAt, setReportedAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setResultValue(order?.result?.resultValue ?? "");
    setUnit(order?.result?.unit ?? order?.labTest?.defaultUnit ?? "");
    setReferenceRange(order?.result?.referenceRange ?? order?.labTest?.referenceRange ?? "");
    setInterpretation(order?.result?.interpretation ?? "");
    setRemarks(order?.result?.remarks ?? "");
    setObservedAt(toLocalDateTimeInput(order?.result?.observedAt));
    setReportedAt(toLocalDateTimeInput(order?.result?.reportedAt));
    setFormError(null);
  }, [order]);

  if (!order) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography color="text.secondary">Select a lab order to capture sample and enter results.</Typography>
      </Paper>
    );
  }

  const submitDraft = async () => {
    setFormError(null);
    await onSubmit({
      resultValue: resultValue.trim() || undefined,
      unit: unit.trim() || undefined,
      referenceRange: referenceRange.trim() || undefined,
      interpretation: interpretation.trim() || undefined,
      remarks: remarks.trim() || undefined,
      observedAt: fromLocalDateTimeInput(observedAt),
      reportedAt: fromLocalDateTimeInput(reportedAt),
      status: "DRAFT",
    });
  };

  const submitFinal = async () => {
    if (!resultValue.trim()) {
      setFormError("Result value is required to finalize the report.");
      return;
    }
    setFormError(null);
    const nowIso = new Date().toISOString();
    await onSubmit({
      resultValue: resultValue.trim(),
      unit: unit.trim() || undefined,
      referenceRange: referenceRange.trim() || undefined,
      interpretation: interpretation.trim() || undefined,
      remarks: remarks.trim() || undefined,
      observedAt: fromLocalDateTimeInput(observedAt),
      reportedAt: fromLocalDateTimeInput(reportedAt) ?? nowIso,
      status: "FINAL",
    });
  };

  const markSampleCollected = async () => {
    setFormError(null);
    await onSubmit({
      collectedAt: new Date().toISOString(),
      status: order.result?.status === "FINAL" ? "FINAL" : "DRAFT",
    });
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6">Lab Result Entry</Typography>
          <Typography color="text.secondary">
            Capture sample collection, update values, and finalize the report.
          </Typography>
        </Box>

        {formError ? <Alert severity="error">{formError}</Alert> : null}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Order Number"
            value={order.orderNumber}
            fullWidth
            disabled
          />
          <TextField
            label="Current Status"
            value={order.status}
            fullWidth
            disabled
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Result Value"
            value={resultValue}
            onChange={(event) => setResultValue(event.target.value)}
            fullWidth
          />
          <TextField label="Unit" value={unit} onChange={(event) => setUnit(event.target.value)} fullWidth />
          <TextField
            label="Reference Range"
            value={referenceRange}
            onChange={(event) => setReferenceRange(event.target.value)}
            fullWidth
          />
        </Stack>

        <TextField
          label="Interpretation"
          select
          value={interpretation}
          onChange={(event) => setInterpretation(event.target.value)}
          fullWidth
        >
          <MenuItem value="">Not set</MenuItem>
          <MenuItem value="Normal">Normal</MenuItem>
          <MenuItem value="High">High</MenuItem>
          <MenuItem value="Low">Low</MenuItem>
          <MenuItem value="Abnormal">Abnormal</MenuItem>
          <MenuItem value="Critical">Critical</MenuItem>
        </TextField>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            type="datetime-local"
            label="Observed At"
            value={observedAt}
            onChange={(event) => setObservedAt(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            type="datetime-local"
            label="Reported At"
            value={reportedAt}
            onChange={(event) => setReportedAt(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Stack>

        <TextField
          label="Remarks"
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          multiline
          minRows={3}
          fullWidth
        />

        <Divider />

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <Button variant="outlined" onClick={() => void markSampleCollected()} disabled={isSubmitting}>
            {order.collectedAt ? "Update Sample Time" : "Mark Sample Collected"}
          </Button>
          <Button variant="outlined" onClick={() => void submitDraft()} disabled={isSubmitting}>
            Save Draft
          </Button>
          <Button variant="contained" onClick={() => void submitFinal()} disabled={isSubmitting}>
            Finalize Result
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export type { LabResultSubmitPayload };
