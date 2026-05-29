import { useEffect, useState } from "react";
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { useUpdateAppointmentStatusMutation, type Appointment } from "../../store/api";

type AppointmentDetailsModalProps = {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onReschedule: (appointment: Appointment) => void;
  onStartVisit: (appointment: Appointment) => void;
};

const statusColorByValue: Record<Appointment["status"], "default" | "success" | "error" | "warning" | "info"> = {
  SCHEDULED: "info",
  COMPLETED: "success",
  CANCELLED: "error",
  NO_SHOW: "warning",
};

const parseApiError = (error: unknown): string => {
  if (!error || typeof error !== "object") {
    return "Unable to update appointment";
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

  return parsed.data?.message ?? parsed.data?.error ?? "Unable to update appointment";
};

export const AppointmentDetailsModal = ({
  open,
  appointment,
  onClose,
  onReschedule,
  onStartVisit,
}: AppointmentDetailsModalProps) => {
  const [updateAppointmentStatus, { isLoading }] = useUpdateAppointmentStatusMutation();
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setErrorText(null);
    }
  }, [open, appointment?.id]);

  const handleStatusUpdate = async (status: "COMPLETED" | "CANCELLED") => {
    if (!appointment) {
      return;
    }

    try {
      setErrorText(null);
      await updateAppointmentStatus({
        id: appointment.id,
        status,
      }).unwrap();
      onClose();
    } catch (error) {
      setErrorText(parseApiError(error));
    }
  };

  if (!appointment) {
    return null;
  }

  const canComplete = appointment.status === "SCHEDULED" || appointment.status === "NO_SHOW";
  const canCancel = appointment.status === "SCHEDULED";
  const canStartVisit = appointment.status !== "CANCELLED";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Appointment Details</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {errorText ? <Alert severity="error">{errorText}</Alert> : null}
          <Typography>
            <strong>Patient:</strong> {appointment.patient.name} ({appointment.patient.mrn})
          </Typography>
          <Typography>
            <strong>Doctor:</strong> {appointment.doctor.name}
            {appointment.doctor.specialization ? ` - ${appointment.doctor.specialization}` : ""}
          </Typography>
          <Typography>
            <strong>Date & Time:</strong> {new Date(appointment.scheduledAt).toLocaleString()}
          </Typography>
          <Typography>
            <strong>Reason:</strong> {appointment.notes?.trim() ? appointment.notes : "-"}
          </Typography>
          <Chip label={appointment.status} color={statusColorByValue[appointment.status]} sx={{ width: "fit-content" }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Close
        </Button>
        <Button onClick={() => onReschedule(appointment)} disabled={isLoading || appointment.status === "CANCELLED"}>
          Reschedule
        </Button>
        <Button variant="contained" onClick={() => onStartVisit(appointment)} disabled={isLoading || !canStartVisit}>
          Start Visit
        </Button>
        <Button color="success" onClick={() => handleStatusUpdate("COMPLETED")} disabled={isLoading || !canComplete}>
          Mark Complete
        </Button>
        <Button color="error" onClick={() => handleStatusUpdate("CANCELLED")} disabled={isLoading || !canCancel}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
