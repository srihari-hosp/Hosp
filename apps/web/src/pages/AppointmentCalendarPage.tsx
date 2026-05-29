import { useMemo, useState, type CSSProperties } from "react";
import { Alert, Box, Chip, Paper, Stack, Typography, alpha, Button } from "@mui/material";
import { Calendar, dateFnsLocalizer, type SlotInfo, type View } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { AppointmentDetailsModal, AppointmentFormModal } from "../components/appointments";
import {
  AddCircleOutline,
} from "@mui/icons-material";
import {
  useGetAppointmentsQuery,
  useGetDoctorsQuery,
  useGetPatientsQuery,
  type Appointment,
} from "../store/api";
import { tokens } from "../theme/tokens";

const appointmentStatusColors: Record<Appointment["status"], string> = {
  SCHEDULED: tokens.colors.primary,
  COMPLETED: "#2e7d32",
  CANCELLED: "#d32f2f",
  NO_SHOW: "#ed6c02",
};

type CalendarAppointmentEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Appointment;
};

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const statusLegend = (Object.keys(appointmentStatusColors) as Appointment["status"][]).map((status) => ({
  status,
  color: appointmentStatusColors[status],
}));

const parseApiError = (error: unknown): string => {
  if (!error || typeof error !== "object") return "Failed to load appointments";
  const parsed = error as { status?: unknown; data?: { message?: string; error?: string } };
  if (parsed.status === "FETCH_ERROR") return "Unable to connect to API server.";
  return parsed.data?.message ?? parsed.data?.error ?? "Failed to load appointments";
};

const blurActiveElement = () => {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) activeElement.blur();
};

export const AppointmentCalendarPage = () => {
  const navigate = useNavigate();
  const [calendarView, setCalendarView] = useState<View>("week");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [selectedSlotStart, setSelectedSlotStart] = useState<Date | undefined>(undefined);

  const { data: appointments = [], isLoading, error } = useGetAppointmentsQuery();
  const { data: patients = [] } = useGetPatientsQuery();
  const { data: doctors = [] } = useGetDoctorsQuery();

  const events = useMemo<CalendarAppointmentEvent[]>(
    () =>
      appointments.map((appointment) => {
        const start = new Date(appointment.scheduledAt);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        return {
          id: appointment.id,
          title: `${appointment.patient.name} • Dr. ${appointment.doctor.name.split(" ").pop()}`,
          start,
          end,
          resource: appointment,
        };
      }),
    [appointments]
  );

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (!(slotInfo.start instanceof Date)) return;
    blurActiveElement();
    setRescheduleAppointment(null);
    setSelectedSlotStart(slotInfo.start);
    setFormOpen(true);
  };

  const handleSelectEvent = (event: CalendarAppointmentEvent) => {
    blurActiveElement();
    setSelectedAppointment(event.resource);
    setDetailsOpen(true);
  };

  const handleReschedule = (appointment: Appointment) => {
    setDetailsOpen(false);
    setRescheduleAppointment(appointment);
    setSelectedSlotStart(new Date(appointment.scheduledAt));
    setFormOpen(true);
  };

  const handleStartVisit = (appointment: Appointment) => {
    setDetailsOpen(false);
    navigate(`/appointments/${appointment.id}/visit`);
  };

  const eventStyleGetter = (event: CalendarAppointmentEvent): { style: CSSProperties } => {
    const color = appointmentStatusColors[event.resource.status];
    return {
      style: {
        backgroundColor: alpha(color, 0.1),
        borderRadius: "8px",
        borderLeft: `4px solid ${color}`,
        color: color,
        padding: "4px 10px",
        fontSize: "0.75rem",
        fontWeight: 700,
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
      },
    };
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: tokens.colors.surface, minHeight: '100%' }}>
      <Stack spacing={4}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.04em", mb: 0.5 }}>
              Clinical Calendar
            </Typography>
            <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>
              Manage patient visits and clinical schedules.
            </Typography>
          </Box>
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddCircleOutline />}
            onClick={() => {
              setSelectedSlotStart(new Date());
              setFormOpen(true);
            }}
            sx={{
              borderRadius: "12px",
              px: 4,
              py: 1.5,
              fontWeight: 700,
              textTransform: "none",
              bgcolor: tokens.colors.primary,
              '&:hover': { bgcolor: tokens.colors.primaryContainer }
            }}
          >
            New Appointment
          </Button>
        </Stack>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
          <Typography sx={{ fontWeight: 800, color: tokens.colors.onSurfaceVariant, opacity: 0.5, mr: 1, textTransform: "uppercase", fontSize: '0.7rem', letterSpacing: '0.05em' }}>Legend:</Typography>
          {statusLegend.map((entry) => (
            <Chip
              key={entry.status}
              label={entry.status}
              size="small"
              sx={{
                borderRadius: "8px",
                bgcolor: alpha(entry.color, 0.08),
                color: entry.color,
                borderColor: alpha(entry.color, 0.2),
                fontWeight: 800,
                fontSize: "0.7rem",
                letterSpacing: '0.02em',
                px: 1
              }}
              variant="outlined"
            />
          ))}
        </Stack>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            height: { xs: 620, md: 800 },
            borderRadius: "32px",
            border: `1px solid ${tokens.colors.outlineVariant}`,
            bgcolor: "white",
            overflow: "hidden",
            "& .rbc-calendar": {
              fontFamily: tokens.typography.fontFamily,
            },
            "& .rbc-header": {
              padding: "16px 0",
              fontWeight: 800,
              fontSize: "0.875rem",
              color: tokens.colors.onSurfaceVariant,
              borderBottom: `1px solid ${alpha(tokens.colors.outlineVariant, 0.5)}`,
            },
            "& .rbc-time-view": {
              border: "none",
            },
            "& .rbc-timeslot-group": {
              borderBottom: `1px solid ${alpha(tokens.colors.outlineVariant, 0.3)}`,
            },
            "& .rbc-off-range-bg": {
              bgcolor: tokens.colors.surfaceContainerLow,
            },
            "& .rbc-today": {
              bgcolor: alpha(tokens.colors.primary, 0.02),
            },
            "& .rbc-toolbar": {
              mb: 4,
              "& button": {
                borderRadius: "10px",
                fontWeight: 700,
                color: tokens.colors.onSurfaceVariant,
                border: `1px solid ${tokens.colors.outlineVariant} !important`,
                px: 2,
                py: 1,
                fontSize: '0.875rem',
                transition: 'all 0.2s',
                "&:hover": { bgcolor: alpha(tokens.colors.primary, 0.05), borderColor: tokens.colors.primary },
                "&.rbc-active": {
                  bgcolor: tokens.colors.primary,
                  color: "white",
                  borderColor: tokens.colors.primary,
                  "&:hover": { bgcolor: tokens.colors.primaryContainer },
                }
              }
            }
          }}
        >
          {isLoading ? (
            <Stack justifyContent="center" alignItems="center" sx={{ height: "100%" }}>
              <Typography sx={{ fontWeight: 700, color: tokens.colors.onSurfaceVariant }}>Loading Clinical Schedule...</Typography>
            </Stack>
          ) : error ? (
            <Alert severity="error">{parseApiError(error)}</Alert>
          ) : (
            <Calendar<CalendarAppointmentEvent>
              localizer={localizer}
              events={events}
              defaultView="week"
              view={calendarView}
              onView={setCalendarView}
              views={["day", "week"]}
              step={30}
              timeslots={1}
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={(event: CalendarAppointmentEvent) => handleSelectEvent(event)}
              eventPropGetter={(event: CalendarAppointmentEvent) => eventStyleGetter(event)}
              startAccessor="start"
              endAccessor="end"
              min={new Date(1970, 1, 1, 8, 0, 0)}
              max={new Date(1970, 1, 1, 20, 0, 0)}
            />
          )}
        </Paper>

        <AppointmentFormModal
          open={formOpen}
          patients={patients}
          doctors={doctors}
          initialStart={selectedSlotStart}
          appointmentToReschedule={rescheduleAppointment}
          onClose={() => {
            setFormOpen(false);
            setRescheduleAppointment(null);
          }}
        />

        <AppointmentDetailsModal
          open={detailsOpen}
          appointment={selectedAppointment}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedAppointment(null);
          }}
          onReschedule={handleReschedule}
          onStartVisit={handleStartVisit}
        />
      </Stack>
    </Box>
  );
};
