import { Add, DeleteOutline } from "@mui/icons-material";
import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";

export type MedicationRow = {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  durationDays: string;
};

type PrescriptionSectionProps = {
  rows: MedicationRow[];
  disabled?: boolean;
  onAddMedication: () => void;
  onRemoveMedication: (rowId: string) => void;
  onChangeMedication: (rowId: string, field: keyof Omit<MedicationRow, "id">, value: string) => void;
};

export const PrescriptionSection = ({
  rows,
  disabled,
  onAddMedication,
  onRemoveMedication,
  onChangeMedication,
}: PrescriptionSectionProps) => {
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Prescription</Typography>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={onAddMedication}
          disabled={disabled}
        >
          Add Medication
        </Button>
      </Stack>

      {rows.map((row, index) => (
        <Box
          key={row.id}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 2,
          }}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">Medication #{index + 1}</Typography>
              <IconButton
                aria-label="Remove medication row"
                onClick={() => onRemoveMedication(row.id)}
                disabled={disabled || rows.length === 1}
                size="small"
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <Box sx={{ flex: 3 }}>
                <TextField
                  label="Medication Name"
                  value={row.medication}
                  onChange={(event) => onChangeMedication(row.id, "medication", event.target.value)}
                  fullWidth
                  required
                  disabled={disabled}
                />
              </Box>
              <Box sx={{ flex: 2 }}>
                <TextField
                  label="Dosage"
                  value={row.dosage}
                  onChange={(event) => onChangeMedication(row.id, "dosage", event.target.value)}
                  fullWidth
                  required
                  disabled={disabled}
                />
              </Box>
              <Box sx={{ flex: 2 }}>
                <TextField
                  label="Frequency"
                  value={row.frequency}
                  onChange={(event) => onChangeMedication(row.id, "frequency", event.target.value)}
                  fullWidth
                  required
                  disabled={disabled}
                />
              </Box>
              <Box sx={{ flex: 2 }}>
                <TextField
                  type="number"
                  label="Duration (days)"
                  value={row.durationDays}
                  onChange={(event) => onChangeMedication(row.id, "durationDays", event.target.value)}
                  fullWidth
                  required
                  disabled={disabled}
                  inputProps={{ min: 1 }}
                />
              </Box>
            </Stack>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
};
