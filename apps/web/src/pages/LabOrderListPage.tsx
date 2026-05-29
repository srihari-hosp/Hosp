import { useMemo, useState } from "react";
import { PictureAsPdf, Science, Search, PersonOutline, MedicalServicesOutlined, ListAltOutlined, PriorityHigh, NotesOutlined, FactCheck } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  InputAdornment,
  Avatar,
  IconButton,
} from "@mui/material";
import { pdf } from "@react-pdf/renderer";
import { LabResultEntryForm, type LabResultSubmitPayload } from "../components/lab";
import { LabReportPDF } from "../components/pdf";
import {
  useCreateLabOrderMutation,
  useGetDoctorsQuery,
  useGetLabOrdersQuery,
  useGetLabTestsQuery,
  useGetPatientsQuery,
  useUpdateLabResultMutation,
  type LabOrderRecord,
  type LabOrderStatus,
} from "../store/api";
import { useAppSelector } from "../store/hooks";
import { tokens, glassmorphism } from "../theme/tokens";

type OrderStatusFilter = "ALL" | "ORDERED" | "SAMPLE_COLLECTED" | "RESULT_UPDATED" | "COMPLETED";

const ORDER_STATUS_FILTERS: Array<{ label: string; value: OrderStatusFilter }> = [
  { label: "All Orders", value: "ALL" },
  { label: "Ordered", value: "ORDERED" },
  { label: "Sample", value: "SAMPLE_COLLECTED" },
  { label: "Result", value: "RESULT_UPDATED" },
  { label: "Done", value: "COMPLETED" },
];

const parseApiError = (error: unknown): string => {
  if (!error || typeof error !== "object") return "Unable to process request.";
  const parsed = error as { status?: unknown; data?: { message?: string; error?: string }; message?: string };
  if (parsed.status === "FETCH_ERROR") return "Unable to connect to API server.";
  return parsed.data?.message ?? parsed.data?.error ?? parsed.message ?? "Unable to process request.";
};

const toDate = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const normalizeSearch = (value: string): string => value.trim().toLowerCase();

const statusColorMap: Record<LabOrderStatus, string> = {
  ORDERED: "#ed6c02",
  SAMPLE_COLLECTED: tokens.colors.primary,
  RESULT_UPDATED: tokens.colors.primary,
  COMPLETED: "#2e7d32",
};

const openLabReportPdf = async (order: LabOrderRecord, hospitalName: string, hospitalAddress: string): Promise<void> => {
  const doc = <LabReportPDF order={order} hospitalName={hospitalName} hospitalAddress={hospitalAddress} />;
  const blob = await pdf(doc).toBlob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
};

export const LabOrderListPage = () => {
  const tenant = useAppSelector((state) => state.tenant.currentTenant);
  const hospitalName = tenant?.name ?? "Hospital";
  const hospitalAddress = "Hospital Address";

  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [formPatientId, setFormPatientId] = useState("");
  const [formDoctorId, setFormDoctorId] = useState("");
  const [formLabTestId, setFormLabTestId] = useState("");
  const [formPriority, setFormPriority] = useState<"ROUTINE" | "URGENT" | "STAT">("ROUTINE");
  const [formClinicalNotes, setFormClinicalNotes] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: patients = [] } = useGetPatientsQuery();
  const { data: doctors = [] } = useGetDoctorsQuery();
  const { data: labTests = [] } = useGetLabTestsQuery();
  const {
    data: labOrders = [],
    isLoading: isLoadingOrders,
    error: labOrdersError,
  } = useGetLabOrdersQuery({
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const [createLabOrder, { isLoading: isCreatingOrder }] = useCreateLabOrderMutation();
  const [updateLabResult, { isLoading: isUpdatingResult }] = useUpdateLabResultMutation();

  const filteredOrders = useMemo(() => {
    const needle = normalizeSearch(search);
    if (!needle) return labOrders;
    return labOrders.filter((order) => {
      const haystack = [
        order.orderNumber,
        order.patient?.name,
        order.patient?.mrn,
        order.labTest?.name,
        order.doctor?.name,
        order.status,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [labOrders, search]);

  const statusCounts = useMemo(() => ({
    ALL: labOrders.length,
    ORDERED: labOrders.filter((order) => order.status === "ORDERED").length,
    SAMPLE_COLLECTED: labOrders.filter((order) => order.status === "SAMPLE_COLLECTED").length,
    RESULT_UPDATED: labOrders.filter((order) => order.status === "RESULT_UPDATED").length,
    COMPLETED: labOrders.filter((order) => order.status === "COMPLETED").length,
  }), [labOrders]);

  const selectedOrder =
    filteredOrders.find((order) => order.id === selectedOrderId) ??
    labOrders.find((order) => order.id === selectedOrderId) ??
    null;

  const handleCreateOrder = async () => {
    if (!formPatientId || !formDoctorId || !formLabTestId) {
      setErrorText("Patient, doctor and lab test are required.");
      return;
    }
    try {
      setErrorText(null);
      setSuccessText(null);
      const response = await createLabOrder({
        patientId: formPatientId,
        doctorId: formDoctorId,
        labTestId: formLabTestId,
        priority: formPriority,
        clinicalNotes: formClinicalNotes.trim() || undefined,
        notes: formNotes.trim() || undefined,
      }).unwrap();
      setSelectedOrderId(response.order.id);
      setSuccessText(response.message ?? "Lab order created.");
      setFormClinicalNotes("");
      setFormNotes("");
    } catch (error) {
      setErrorText(parseApiError(error));
    }
  };

  const handleSubmitResult = async (payload: LabResultSubmitPayload) => {
    if (!selectedOrder) return;
    try {
      setErrorText(null);
      setSuccessText(null);
      const response = await updateLabResult({
        orderId: selectedOrder.id,
        ...payload,
      }).unwrap();
      setSuccessText(response.message ?? "Lab result updated.");
    } catch (error) {
      setErrorText(parseApiError(error));
      throw error;
    }
  };

  const handlePrintReport = async () => {
    if (!selectedOrder?.result) return;
    try {
      setErrorText(null);
      setSuccessText(null);
      setIsPrinting(true);
      await openLabReportPdf(selectedOrder, hospitalName, hospitalAddress);
    } catch (error) {
      setErrorText(parseApiError(error));
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: tokens.colors.surface, minHeight: '100%' }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.04em", mb: 0.5 }}>
            Laboratory Workflow
          </Typography>
          <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>
            Manage diagnostic orders, sample collection, and reporting.
          </Typography>
        </Box>

        {(errorText || successText || labOrdersError) && (
          <Alert severity={successText ? "success" : "error"} sx={{ borderRadius: "16px", fontWeight: 600 }}>
            {successText || errorText || parseApiError(labOrdersError)}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: "24px", border: `1px solid ${tokens.colors.outlineVariant}`, bgcolor: "white" }}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ p: 1.5, borderRadius: "12px", bgcolor: alpha(tokens.colors.primary, 0.08), color: tokens.colors.primary, display: 'flex' }}>
                    <Science fontSize="small" />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.125rem' }}>New Diagnostic Order</Typography>
                </Stack>
                
                <TextField
                  select
                  label="Patient"
                  size="small"
                  value={formPatientId}
                  onChange={e => setFormPatientId(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline fontSize="small" /></InputAdornment> }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                >
                  {patients.map(p => <MenuItem key={p.id} value={p.id}>{p.name} ({p.mrn})</MenuItem>)}
                </TextField>

                <TextField
                  select
                  label="Doctor"
                  size="small"
                  value={formDoctorId}
                  onChange={e => setFormDoctorId(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><MedicalServicesOutlined fontSize="small" /></InputAdornment> }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                >
                  {doctors.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </TextField>

                <TextField
                  select
                  label="Lab Test"
                  size="small"
                  value={formLabTestId}
                  onChange={e => setFormLabTestId(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><ListAltOutlined fontSize="small" /></InputAdornment> }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                >
                  {labTests.map(t => <MenuItem key={t.id} value={t.id}>{t.name} ({t.code})</MenuItem>)}
                </TextField>

                <TextField
                  select
                  label="Priority"
                  size="small"
                  value={formPriority}
                  onChange={e => setFormPriority(e.target.value as "ROUTINE" | "URGENT" | "STAT")}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PriorityHigh fontSize="small" /></InputAdornment> }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                >
                  <MenuItem value="ROUTINE">Routine</MenuItem>
                  <MenuItem value="URGENT">Urgent</MenuItem>
                  <MenuItem value="STAT">STAT</MenuItem>
                </TextField>

                <TextField
                  label="Clinical Notes"
                  size="small"
                  value={formClinicalNotes}
                  onChange={e => setFormClinicalNotes(e.target.value)}
                  multiline
                  minRows={2}
                  InputProps={{ startAdornment: <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}><NotesOutlined fontSize="small" /></InputAdornment> }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />

                <Button
                  variant="contained"
                  disableElevation
                  fullWidth
                  onClick={() => void handleCreateOrder()}
                  disabled={isCreatingOrder}
                  sx={{
                    borderRadius: "14px",
                    py: 1.8,
                    fontWeight: 700,
                    textTransform: "none",
                    bgcolor: tokens.colors.primary,
                    '&:hover': { bgcolor: tokens.colors.primaryContainer }
                  }}
                >
                  {isCreatingOrder ? "Placing Order..." : "Place Lab Order"}
                </Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={3}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: "24px", border: `1px solid ${tokens.colors.outlineVariant}`, bgcolor: "white" }}>
                <TextField
                  placeholder="Search orders, patients, tests..."
                  fullWidth
                  size="small"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: tokens.colors.onSurfaceVariant }} /></InputAdornment>,
                    sx: { borderRadius: '12px' }
                  }}
                  sx={{ mb: 2.5 }}
                />
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  {ORDER_STATUS_FILTERS.map((item) => (
                    <Chip
                      key={item.value}
                      label={`${item.label} (${(statusCounts as Record<string, number>)[item.value]})`}
                      onClick={() => setStatusFilter(item.value)}
                      sx={{
                        borderRadius: "10px",
                        fontWeight: 800,
                        fontSize: "0.75rem",
                        letterSpacing: '0.02em',
                        bgcolor: statusFilter === item.value ? tokens.colors.primary : "transparent",
                        color: statusFilter === item.value ? "white" : tokens.colors.onSurfaceVariant,
                        borderColor: statusFilter === item.value ? tokens.colors.primary : tokens.colors.outlineVariant,
                        "&:hover": { bgcolor: statusFilter === item.value ? tokens.colors.primary : alpha(tokens.colors.primary, 0.05) }
                      }}
                      variant={statusFilter === item.value ? "filled" : "outlined"}
                    />
                  ))}
                </Stack>
              </Paper>

              <Paper elevation={0} sx={{ borderRadius: "32px", border: `1px solid ${tokens.colors.outlineVariant}`, overflow: "hidden", bgcolor: "white" }}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="medium">
                    <TableHead sx={{ bgcolor: alpha(tokens.colors.primary, 0.02) }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, color: tokens.colors.onSurfaceVariant, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: '0.05em' }}>Order & Patient</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: tokens.colors.onSurfaceVariant, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: '0.05em' }}>Diagnostic Test</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: tokens.colors.onSurfaceVariant, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: '0.05em' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: tokens.colors.onSurfaceVariant, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: '0.05em' }}>Ordered</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: tokens.colors.onSurfaceVariant, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: '0.05em' }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {isLoadingOrders ? (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8 }}><CircularProgress size={30} /></TableCell></TableRow>
                      ) : filteredOrders.map((order) => {
                        const color = statusColorMap[order.status] || tokens.colors.onSurfaceVariant;
                        return (
                          <TableRow
                            key={order.id}
                            hover
                            selected={selectedOrderId === order.id}
                            onClick={() => setSelectedOrderId(order.id)}
                            sx={{ 
                              cursor: "pointer", 
                              "&:last-child td, &:last-child th": { border: 0 },
                              "&.Mui-selected": { bgcolor: alpha(tokens.colors.primary, 0.04) },
                              "&.Mui-selected:hover": { bgcolor: alpha(tokens.colors.primary, 0.06) }
                            }}
                          >
                            <TableCell>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ width: 36, height: 36, bgcolor: alpha(tokens.colors.primary, 0.06), color: tokens.colors.primary, fontSize: "0.9rem", fontWeight: 800 }}>
                                  {order.patient.name[0]}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>#{order.orderNumber}</Typography>
                                  <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 600 }}>{order.patient.name}</Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{order.labTest.name}</Typography>
                              <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>{order.priority}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={order.status.replace(/_/g, " ")}
                                size="small"
                                sx={{
                                  fontWeight: 800,
                                  fontSize: "0.65rem",
                                  borderRadius: "8px",
                                  bgcolor: alpha(color, 0.06),
                                  color: color,
                                  borderColor: alpha(color, 0.2),
                                }}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 600 }}>{toDate(order.orderedAt)}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small" sx={{ color: tokens.colors.primary }}><FactCheck fontSize="small" /></IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            </Stack>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: "32px", ...glassmorphism, height: "100%" }}>
              <Stack spacing={4}>
                <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>Workflow Timeline</Typography>
                {!selectedOrder ? (
                  <Box sx={{ py: 6, textAlign: 'center', opacity: 0.5 }}>
                    <Science sx={{ fontSize: 48, mb: 2, color: tokens.colors.outlineVariant }} />
                    <Typography sx={{ fontWeight: 600, color: tokens.colors.onSurfaceVariant }}>Select an order to view the clinical workflow timeline.</Typography>
                  </Box>
                ) : (
                  <>
                    <Stack spacing={3}>
                      {[
                        { label: "Order Placed", date: selectedOrder.orderedAt, active: !!selectedOrder.orderedAt },
                        { label: "Sample Collected", date: selectedOrder.collectedAt, active: !!selectedOrder.collectedAt },
                        { label: "Result Reported", date: selectedOrder.result?.reportedAt, active: !!selectedOrder.result?.reportedAt },
                        { label: "Final Report", date: selectedOrder.result?.status === "FINAL" ? selectedOrder.result.reportedAt : null, active: selectedOrder.result?.status === "FINAL" },
                      ].map((step, idx) => (
                        <Stack key={idx} direction="row" spacing={3} alignItems="center">
                          <Box sx={{ 
                            width: 14, 
                            height: 14, 
                            borderRadius: "50%", 
                            bgcolor: step.active ? "#2e7d32" : alpha(tokens.colors.outlineVariant, 0.3),
                            boxShadow: step.active ? `0 0 0 4px ${alpha("#2e7d32", 0.1)}` : 'none'
                          }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: step.active ? tokens.colors.onSurface : tokens.colors.onSurfaceVariant }}>{step.label}</Typography>
                            <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>{toDate(step.date)}</Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                    <Divider sx={{ borderStyle: "dashed" }} />
                    <Button
                      variant="contained"
                      disableElevation
                      startIcon={isPrinting ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdf />}
                      disabled={isPrinting || !selectedOrder.result}
                      onClick={() => void handlePrintReport()}
                      sx={{ 
                        borderRadius: "14px", 
                        py: 2, 
                        fontWeight: 700, 
                        textTransform: "none", 
                        bgcolor: tokens.colors.primary,
                        boxShadow: `0 8px 16px ${alpha(tokens.colors.primary, 0.2)}`,
                        "&:hover": { bgcolor: tokens.colors.primaryContainer }
                      }}
                    >
                      {isPrinting ? "Generating..." : "Download Lab Report PDF"}
                    </Button>
                  </>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 7 }}>
            <LabResultEntryForm
              order={selectedOrder}
              isSubmitting={isUpdatingResult}
              onSubmit={handleSubmitResult}
            />
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};
