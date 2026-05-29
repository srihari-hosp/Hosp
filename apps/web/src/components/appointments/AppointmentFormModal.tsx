import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Close,
  PersonOutline,
  MedicalServicesOutlined,
  CalendarMonthOutlined,
  NotesOutlined,
  EventAvailable,
} from "@mui/icons-material";
import {
  useCreateAppointmentMutation,
  useUpdateAppointmentStatusMutation,
  type Appointment,
  type Doctor,
  type Patient,
} from "../../store/api";

const themeTokens = {
  colors: {
    primary: "#005dac",
    text: {
      primary: "#1a1c1e",
      secondary: "#44474e",
    },
  },
};

type AppointmentFormModalProps = {
  open: boolean;
  patients: Patient[];
  doctors: Doctor[];
  initialStart?: Date;
  appointmentToReschedule?: Appointment | null;
  onClose: () => void;
};

const toDateTimeLocalValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const parseApiError = (error: unknown): string => {
  if (!error || typeof error !== "object") return "Failed to save appointment";
  const parsed = error as { status?: unknown; data?: { message?: string; error?: string } };
  if (parsed.status === 409) return parsed.data?.message ?? "Time slot is already booked for this doctor.";
  if (parsed.status === "FETCH_ERROR") return "Unable to connect to API server.";
  return parsed.data?.message ?? parsed.data?.error ?? "Failed to save appointment";
};

export const AppointmentFormModal = ({
  open,
  patients,
  doctors,
  initialStart,
  appointmentToReschedule,
  onClose,
}: AppointmentFormModalProps) => {
  const [createAppointment, { isLoading: isCreating }] = useCreateAppointmentMutation();
  const [updateAppointmentStatus, { isLoading: isUpdatingStatus }] = useUpdateAppointmentStatusMutation();

  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [errorText, setErrorText] = useState<string | null>(null);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

  useEffect(() => {
    if (!open) return;
    if (appointmentToReschedule) {
      setSelectedPatientId(appointmentToReschedule.patientId);
      setSelectedDoctorId(appointmentToReschedule.doctorId);
      setScheduledAt(toDateTimeLocalValue(new Date(appointmentToReschedule.scheduledAt)));
      setReason(appointmentToReschedule.notes ?? "");
      setErrorText(null);
      return;
    }
    setSelectedPatientId("");
    setSelectedDoctorId("");
    setScheduledAt(toDateTimeLocalValue(initialStart ?? new Date()));
    setReason("");
    setErrorText(null);
  }, [appointmentToReschedule, initialStart, open]);

  const validateForm = (): string | null => {
    if (!selectedPatientId || !selectedDoctorId || !scheduledAt || !reason.trim()) {
      return "All fields are required.";
    }
    const chosenDate = new Date(scheduledAt);
    if (Number.isNaN(chosenDate.getTime())) return "Please provide a valid date and time.";
    if (chosenDate <= new Date()) return "Appointment time must be in the future.";
    return null;
  };

  const isSubmitting = isCreating || isUpdatingStatus;

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setErrorText(validationError);
      return;
    }

    setErrorText(null);
    try {
      const payload = {
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes: reason.trim(),
      };

      if (!appointmentToReschedule) {
        await createAppointment(payload).unwrap();
      } else {
        await createAppointment(payload).unwrap();
        await updateAppointmentStatus({
          id: appointmentToReschedule.id,
          status: "CANCELLED",
        }).unwrap();
      }
      onClose();
    } catch (error) {
      setErrorText(parseApiError(error));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: "24px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.1)",
        },
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ p: 1, borderRadius: "10px", bgcolor: alpha(themeTokens.colors.primary, 0.08), color: themeTokens.colors.primary }}>
            <EventAvailable fontSize="small" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {appointmentToReschedule ? "Reschedule Appointment" : "New Appointment"}
          </Typography>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: "text.disabled" }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 0 }}>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {errorText ? (
            <Alert severity="error" sx={{ borderRadius: "12px" }}>
              {errorText}
            </Alert>
          ) : null}

          <Autocomplete
            options={patients}
            value={selectedPatient}
            onChange={(_, value) => setSelectedPatientId(value?.id ?? "")}
            getOptionLabel={(option) => `${option.name} (${option.mrn})`}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Patient"
                required
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <PersonOutline fontSize="small" />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />

          <TextField
            select
            label="Consulting Doctor"
            required
            size="small"
            value={selectedDoctorId}
            onChange={(event) => setSelectedDoctorId(event.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><MedicalServicesOutlined fontSize="small" /></InputAdornment>,
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          >
            {doctors.map((doctor) => (
              <MenuItem key={doctor.id} value={doctor.id}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{doctor.name}</Typography>
                <Typography variant="caption" sx={{ ml: 1, color: "text.secondary" }}>
                  {doctor.specialization ? `(${doctor.specialization})` : ""}
                </Typography>
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Appointment Date & Time"
            type="datetime-local"
            size="small"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            InputProps={{
              startAdornment: <InputAdornment position="start"><CalendarMonthOutlined fontSize="small" /></InputAdornment>,
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />

          <TextField
            label="Reason for Visit"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            multiline
            minRows={3}
            required
            placeholder="Briefly describe the symptoms or reason for the visit"
            InputProps={{
              startAdornment: <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}><NotesOutlined fontSize="small" /></InputAdornment>,
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 4 }}>
        <Box sx={{ flex: 1 }}>
          {appointmentToReschedule ? (
            <Typography variant="caption" sx={{ color: "info.main", fontWeight: 600, display: "block", lineHeight: 1.2 }}>
              Note: Rescheduling creates a new slot and cancels the current appointment.
            </Typography>
          ) : null}
        </Box>
        <Button
          onClick={onClose}
          disabled={isSubmitting}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px", color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={handleSubmit}
          disabled={isSubmitting}
          sx={{
            borderRadius: "10px",
            px: 4,
            fontWeight: 700,
            textTransform: "none",
            bgcolor: themeTokens.colors.primary,
            "&:hover": { bgcolor: "#004a89" }
          }}
        >
          {isSubmitting ? "Booking..." : appointmentToReschedule ? "Confirm Reschedule" : "Book Appointment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
