import { type FormEvent, useMemo, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Grid,
  alpha,
  InputAdornment,
  CircularProgress,
  Chip,
  Avatar,
} from "@mui/material";
import {
  ShieldOutlined,
  PersonOutline,
  AssignmentOutlined,
  CalendarMonthOutlined,
  ListAltOutlined,
  GppGoodOutlined,
  GppBadOutlined,
} from "@mui/icons-material";
import {
  useGetConsentsQuery,
  useGetPatientsQuery,
  useGrantConsentMutation,
  useWithdrawConsentMutation,
  type ConsentRecord,
} from "../store/api";
import { tokens } from "../theme/tokens";

const formatDateTime = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const readErrorText = (error: unknown): string => {
  if (!error || typeof error !== "object") return "Unexpected request error";
  const parsed = error as { status?: unknown; data?: { message?: string; error?: string } };
  if (parsed.status === "FETCH_ERROR") return "Unable to connect to API server.";
  return parsed.data?.message ?? parsed.data?.error ?? "Request failed";
};

export const ConsentManagementPage = () => {
  const { data: patients = [] } = useGetPatientsQuery();
  const { data: consents = [], isLoading } = useGetConsentsQuery();
  const [grantConsent, { isLoading: isGranting }] = useGrantConsentMutation();
  const [withdrawConsent, { isLoading: isWithdrawing }] = useWithdrawConsentMutation();

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [dataTypesInput, setDataTypesInput] = useState("");
  const [expiryAt, setExpiryAt] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);

  const canSubmit = selectedPatientId.trim().length > 0 && purpose.trim().length >= 2 && !isGranting;

  const activeConsentsCount = useMemo(
    () => consents.filter((record) => record.status === "GRANTED").length,
    [consents]
  );

  const onGrantConsent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setRequestError(null);

    try {
      await grantConsent({
        patientId: selectedPatientId,
        purpose: purpose.trim(),
        dataTypes: dataTypesInput
          .split(",")
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
        expiryAt: expiryAt ? new Date(expiryAt).toISOString() : undefined,
      }).unwrap();
      setPurpose("");
      setDataTypesInput("");
      setExpiryAt("");
      setSelectedPatientId("");
    } catch (grantError) {
      setRequestError(readErrorText(grantError));
    }
  };

  const onWithdrawConsent = async (consentId: string) => {
    setRequestError(null);
    try {
      await withdrawConsent(consentId).unwrap();
    } catch (withdrawError) {
      setRequestError(readErrorText(withdrawError));
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: tokens.colors.surface, minHeight: '100%' }}>
      <Stack spacing={4}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.04em", mb: 0.5 }}>
              Consent Management
            </Typography>
            <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>
              Track and manage patient data access permissions.
            </Typography>
          </Box>
          <Chip
            icon={<ShieldOutlined sx={{ fontSize: "1.1rem !important" }} />}
            label={`${activeConsentsCount} Active Consents`}
            variant="outlined"
            sx={{
              fontWeight: 800,
              borderRadius: "12px",
              borderColor: alpha(tokens.colors.primary, 0.2),
              color: tokens.colors.primary,
              bgcolor: alpha(tokens.colors.primary, 0.05),
              px: 1
            }}
          />
        </Stack>

        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: "24px",
            border: `1px solid ${tokens.colors.outlineVariant}`,
            bgcolor: "white",
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
            <Box sx={{ p: 1.5, borderRadius: "12px", bgcolor: alpha(tokens.colors.primary, 0.08), color: tokens.colors.primary, display: 'flex' }}>
              <GppGoodOutlined fontSize="small" />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.125rem' }}>Grant New Consent</Typography>
          </Stack>

          <Box component="form" onSubmit={onGrantConsent}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Select
                  value={selectedPatientId}
                  displayEmpty
                  size="small"
                  onChange={(event) => setSelectedPatientId(String(event.target.value))}
                  fullWidth
                  startAdornment={<InputAdornment position="start"><PersonOutline fontSize="small" /></InputAdornment>}
                  sx={{ borderRadius: "12px" }}
                >
                  <MenuItem value="" disabled>Select Patient</MenuItem>
                  {patients.map((patient) => (
                    <MenuItem key={patient.id} value={patient.id}>
                      {patient.name} ({patient.mrn})
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Purpose of Access"
                  size="small"
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  placeholder="e.g., Clinical Treatment"
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><AssignmentOutlined fontSize="small" /></InputAdornment>,
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Expiry Date"
                  type="date"
                  size="small"
                  value={expiryAt}
                  onChange={(event) => setExpiryAt(event.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><CalendarMonthOutlined fontSize="small" /></InputAdornment>,
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Data Types Permitted"
                  size="small"
                  value={dataTypesInput}
                  onChange={(event) => setDataTypesInput(event.target.value)}
                  placeholder="e.g., name, diagnosis, medication (comma separated)"
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><ListAltOutlined fontSize="small" /></InputAdornment>,
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Stack direction="row" spacing={3} justifyContent="flex-end" alignItems="center">
                  {requestError && (
                    <Typography variant="caption" color="error" sx={{ fontWeight: 800 }}>
                      {requestError}
                    </Typography>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    disableElevation
                    disabled={!canSubmit}
                    sx={{
                      borderRadius: "12px",
                      px: 5,
                      py: 1.5,
                      fontWeight: 700,
                      textTransform: "none",
                      bgcolor: tokens.colors.primary,
                      "&:hover": { bgcolor: tokens.colors.primaryContainer }
                    }}
                  >
                    {isGranting ? "Granting..." : "Grant Consent"}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: "32px",
            border: `1px solid ${tokens.colors.outlineVariant}`,
            overflow: "hidden",
            bgcolor: "white",
          }}
        >
          <Box sx={{ p: 4, borderBottom: `1px solid ${tokens.colors.outlineVariant}` }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.125rem' }}>Consent Records</Typography>
          </Box>

          <Box sx={{ overflowX: "auto" }}>
            <Table size="medium">
              <TableHead sx={{ bgcolor: alpha(tokens.colors.primary, 0.02) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: tokens.colors.onSurfaceVariant, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: '0.05em' }}>Patient</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: tokens.colors.onSurfaceVariant, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: '0.05em' }}>Purpose</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: tokens.colors.onSurfaceVariant, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: '0.05em' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: tokens.colors.onSurfaceVariant, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: '0.05em' }}>Granted</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: tokens.colors.onSurfaceVariant, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: '0.05em' }}>Expiry</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: tokens.colors.onSurfaceVariant, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: '0.05em' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}><CircularProgress size={30} /></TableCell></TableRow>
                ) : consents.map((record: ConsentRecord) => {
                  const isRevoked = record.status === "REVOKED";
                  return (
                    <TableRow key={record.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ width: 36, height: 36, bgcolor: alpha(tokens.colors.primary, 0.06), color: tokens.colors.primary, fontSize: "0.9rem", fontWeight: 800 }}>
                            {record.patient?.name?.[0] ?? "?"}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>{record.patient?.name ?? "-"}</Typography>
                            <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 600 }}>{record.patient?.mrn ?? "-"}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{record.purpose}</Typography>
                        <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500, display: "block" }}>
                          {record.dataTypes?.join(", ") || "Full Access"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.status}
                          size="small"
                          icon={isRevoked ? <GppBadOutlined sx={{ fontSize: "14px !important" }} /> : <GppGoodOutlined sx={{ fontSize: "14px !important" }} />}
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.7rem",
                            borderRadius: "8px",
                            bgcolor: isRevoked ? alpha("#d32f2f", 0.06) : alpha("#2e7d32", 0.06),
                            color: isRevoked ? "#d32f2f" : "#2e7d32",
                            borderColor: isRevoked ? alpha("#d32f2f", 0.2) : alpha("#2e7d32", 0.2),
                            "& .MuiChip-icon": { color: "inherit" }
                          }}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: "0.875rem", color: tokens.colors.onSurfaceVariant, fontWeight: 600 }}>
                          {formatDateTime(record.grantedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: record.expiryAt ? tokens.colors.onSurface : tokens.colors.onSurfaceVariant, opacity: record.expiryAt ? 1 : 0.5 }}>
                          {formatDateTime(record.expiryAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          color="error"
                          variant="text"
                          disabled={isRevoked || isWithdrawing}
                          onClick={() => onWithdrawConsent(record.id)}
                          sx={{ textTransform: "none", fontWeight: 800, minWidth: 90, borderRadius: '8px' }}
                        >
                          {isRevoked ? "Revoked" : "Withdraw"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && consents.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 10 }}><Typography sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 600 }}>No consent records available.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
};
