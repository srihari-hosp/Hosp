import { useMemo, useState } from "react";
import { Add, DeleteOutline } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Patient } from "../../store/api";

type InvoiceItemForm = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type CreateInvoiceDialogProps = {
  open: boolean;
  patients: Patient[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    patientId: string;
    dueDate?: string;
    notes?: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
  }) => Promise<void>;
};

const createItem = (): InvoiceItemForm => ({
  id: Math.random().toString(36).slice(2),
  description: "",
  quantity: "1",
  unitPrice: "",
});

export const CreateInvoiceDialog = ({ open, patients, isSubmitting, onClose, onSubmit }: CreateInvoiceDialogProps) => {
  const [patientId, setPatientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItemForm[]>([createItem()]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const parsedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        descriptionValid: item.description.trim().length >= 2,
        quantityValue: Number(item.quantity),
        unitPriceValue: Number(item.unitPrice),
      })),
    [items]
  );

  const isFormValid =
    patientId.trim().length > 0 &&
    parsedItems.length > 0 &&
    parsedItems.every(
      (item) =>
        item.descriptionValid &&
        Number.isFinite(item.quantityValue) &&
        Number.isInteger(item.quantityValue) &&
        item.quantityValue > 0 &&
        Number.isFinite(item.unitPriceValue) &&
        item.unitPriceValue >= 0
    );

  const handleReset = () => {
    setPatientId("");
    setDueDate("");
    setNotes("");
    setItems([createItem()]);
    setSubmitAttempted(false);
    setErrorText(null);
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    handleReset();
    onClose();
  };

  const handleAddItem = () => {
    setItems((current) => [...current, createItem()]);
  };

  const handleDeleteItem = (id: string) => {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current));
  };

  const handleItemChange = (id: string, patch: Partial<InvoiceItemForm>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    setErrorText(null);
    if (!isFormValid) {
      return;
    }

    try {
      await onSubmit({
        patientId,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        items: parsedItems.map((item) => ({
          description: item.description.trim(),
          quantity: item.quantityValue,
          unitPrice: item.unitPriceValue,
        })),
      });
      handleReset();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Unable to create invoice.");
      }
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Create Invoice</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {errorText ? <Alert severity="error">{errorText}</Alert> : null}

          <TextField
            select
            label="Patient"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
            error={submitAttempted && patientId.trim().length === 0}
            helperText={submitAttempted && patientId.trim().length === 0 ? "Select a patient." : ""}
            fullWidth
          >
            {patients.map((patient) => (
              <MenuItem key={patient.id} value={patient.id}>
                {patient.name} ({patient.mrn})
              </MenuItem>
            ))}
          </TextField>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              type="date"
              label="Due Date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              fullWidth
            />
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2">Line Items</Typography>
            {parsedItems.map((item, index) => {
              const quantityValid = Number.isInteger(item.quantityValue) && item.quantityValue > 0;
              const unitPriceValid = Number.isFinite(item.unitPriceValue) && item.unitPriceValue >= 0;

              return (
                <Box
                  key={item.id}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 1.5,
                  }}
                >
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                    <TextField
                      label={`Description ${index + 1}`}
                      value={item.description}
                      onChange={(event) => handleItemChange(item.id, { description: event.target.value })}
                      error={submitAttempted && !item.descriptionValid}
                      helperText={submitAttempted && !item.descriptionValid ? "At least 2 characters." : ""}
                      fullWidth
                    />
                    <TextField
                      type="number"
                      label="Qty"
                      inputProps={{ min: 1, step: 1 }}
                      value={item.quantity}
                      onChange={(event) => handleItemChange(item.id, { quantity: event.target.value })}
                      error={submitAttempted && !quantityValid}
                      helperText={submitAttempted && !quantityValid ? "Whole number >= 1." : ""}
                      sx={{ width: { xs: "100%", md: 120 } }}
                    />
                    <TextField
                      type="number"
                      label="Unit Price"
                      inputProps={{ min: 0, step: "0.01" }}
                      value={item.unitPrice}
                      onChange={(event) => handleItemChange(item.id, { unitPrice: event.target.value })}
                      error={submitAttempted && !unitPriceValid}
                      helperText={submitAttempted && !unitPriceValid ? "Value must be >= 0." : ""}
                      sx={{ width: { xs: "100%", md: 180 } }}
                    />
                    <IconButton
                      aria-label="remove line item"
                      disabled={items.length <= 1}
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </Stack>
                </Box>
              );
            })}
          </Stack>

          <Box>
            <Button startIcon={<Add />} onClick={handleAddItem}>
              Add Line Item
            </Button>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Invoice"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
