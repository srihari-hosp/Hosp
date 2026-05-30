import { useMemo } from 'react';
import { PersonAdd, EventAvailable } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  useGetDashboardAppointmentsTrendQuery,
  useGetDashboardSummaryQuery,
  type DashboardAppointmentTrendPoint,
} from '../store/api';
import { tokens } from '../theme/tokens';

const POLLING_INTERVAL_MS = 5 * 60 * 1000;

const parseApiError = (error: unknown): string => {
  if (!error || typeof error !== 'object') {
    return 'Unable to load dashboard data.';
  }
  const parsed = error as {
    status?: unknown;
    data?: { message?: string; error?: string };
    message?: string;
  };
  if (parsed.status === 'FETCH_ERROR') return 'Unable to connect to API server.';
  return (
    parsed.data?.message ??
    parsed.data?.error ??
    parsed.message ??
    'Unable to load dashboard data.'
  );
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const formatTrendLabel = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const DashboardKpiCard = ({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      height: '100%',
      borderRadius: '24px',
      border: `1px solid ${tokens.colors.outlineVariant}`,
      bgcolor: 'white',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        borderColor: tokens.colors.primary,
        boxShadow: '0 12px 24px rgba(0,0,0,0.04)',
      },
    }}
  >
    <Typography
      sx={{ 
        fontWeight: 800, 
        letterSpacing: '0.05em', 
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        color: tokens.colors.onSurfaceVariant,
        mb: 1
      }}
    >
      {label}
    </Typography>
    {loading ? (
      <Skeleton width="60%" height={40} />
    ) : (
      <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', color: tokens.colors.primary }}>
        {value}
      </Typography>
    )}
  </Paper>
);

export const DashboardPage = () => {
  const navigate = useNavigate();

  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    error: summaryError,
  } = useGetDashboardSummaryQuery(undefined, {
    pollingInterval: POLLING_INTERVAL_MS,
  });

  const {
    data: appointmentsTrendData,
    isLoading: isLoadingTrend,
    isFetching: isFetchingTrend,
    error: trendError,
  } = useGetDashboardAppointmentsTrendQuery(
    { days: 7 },
    { pollingInterval: POLLING_INTERVAL_MS }
  );

  const chartData = useMemo(() => {
    const trend = appointmentsTrendData?.trend ?? [];
    return trend.map((entry: DashboardAppointmentTrendPoint) => ({
      ...entry,
      label: formatTrendLabel(entry.date),
    }));
  }, [appointmentsTrendData?.trend]);

  const summaryErrorText = summaryError ? parseApiError(summaryError) : null;
  const trendErrorText = trendError ? parseApiError(trendError) : null;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: tokens.colors.surface, minHeight: '100%' }}>
      <Stack spacing={4}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.04em' }}>
              Dashboard
            </Typography>
            <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>
              Overview of your clinical operations.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<PersonAdd />}
              onClick={() => navigate('/patients')}
              sx={{ 
                borderRadius: '12px', 
                textTransform: 'none', 
                fontWeight: 700,
                borderColor: tokens.colors.outlineVariant,
                color: tokens.colors.onSurface,
                px: 3,
                '&:hover': { borderColor: tokens.colors.primary, bgcolor: alpha(tokens.colors.primary, 0.05) }
              }}
            >
              Add Patient
            </Button>
            <Button
              variant="contained"
              disableElevation
              startIcon={<EventAvailable />}
              onClick={() => navigate('/appointments')}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: tokens.colors.primary,
                px: 3,
                '&:hover': { bgcolor: tokens.colors.primaryContainer }
              }}
            >
              Book Appointment
            </Button>
          </Stack>
        </Stack>

        {(summaryErrorText || trendErrorText) && (
          <Alert severity="error" sx={{ borderRadius: '16px' }}>
            {summaryErrorText || trendErrorText}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <DashboardKpiCard
              label="Total Patients"
              value={String(summaryData?.summary.totalPatients ?? 0)}
              loading={isLoadingSummary}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <DashboardKpiCard
              label="Today's Appointments"
              value={String(summaryData?.summary.todayAppointments ?? 0)}
              loading={isLoadingSummary}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <DashboardKpiCard
              label="Revenue (7 Days)"
              value={formatCurrency(summaryData?.summary.revenueLast7Days ?? 0)}
              loading={isLoadingSummary}
            />
          </Grid>
        </Grid>

        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: '32px',
            border: `1px solid ${tokens.colors.outlineVariant}`,
            bgcolor: 'white'
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 4 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              Appointment Trends
            </Typography>
            {isFetchingTrend && <CircularProgress size={20} />}
          </Stack>

          <Box sx={{ width: '100%', height: 350 }}>
            {isLoadingTrend ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <CircularProgress size={40} />
              </Box>
            ) : chartData.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <Typography color="text.secondary">
                  No trend data available.
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(0,0,0,0.05)"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: tokens.colors.onSurfaceVariant, fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: tokens.colors.onSurfaceVariant, fontSize: 12, fontWeight: 600 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={tokens.colors.primary}
                    strokeWidth={4}
                    dot={{ r: 6, fill: tokens.colors.primary, strokeWidth: 3, stroke: 'white' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                    name="Appointments"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
};
