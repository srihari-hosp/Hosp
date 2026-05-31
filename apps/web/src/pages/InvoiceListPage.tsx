import { useMemo, useState } from "react";
import { Add, Download, ReceiptLong, Search, CalendarMonth } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  Grid,
  IconButton,
} from "@mui/material";
import { pdf } from "@react-pdf/renderer";
import { CreateInvoiceDialog, InvoiceDetailsDrawer } from "../components/billing";
import { InvoicePDF } from "../components/pdf";
import { useDebounce } from "../hooks/useDebounce";
import {
  useCreateInvoiceMutation,
  useGenerateInvoicePdfMutation,
  useGetInvoicesQuery,
  useGetPatientsQuery,
  useLazyGetQueueJobStatusQuery,
  useRecordInvoicePaymentMutation,
  type InvoiceRecord,
  type InvoiceStatus,
  type CreateInvoiceRequest,
  type RecordInvoicePaymentRequest,
} from "../store/api";
import { useAppSelector } from "../store/hooks";

const themeTokens = {
  colors: {
    primary: "#005dac",
    background: "#f8f9fc",
    status: {
      PAID: "#2e7d32",
      UNPAID: "#d32f2f",
      PARTIALLY_PAID: "#ed6c02",
    }
  },
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const parseApiError = (error: unknown): string => {
  if (!error || typeof error !== "object") return "Unable to process request.";
  const parsed = error as { status?: unknown; data?: { message?: string; error?: string }; message?: string };
  if (parsed.status === "FETCH_ERROR") return "Unable to connect to API server.";
  return parsed.data?.message ?? parsed.data?.error ?? parsed.message ?? "Unable to process request.";
};

const toCurrency = (value: string): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(numeric);
};

const toDate = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const openClientGeneratedPdf = async (
  invoice: InvoiceRecord,
  hospitalName: string,
  hospitalAddress: string
): Promise<void> => {
  const doc = <InvoicePDF hospitalName={hospitalName} hospitalAddress={hospitalAddress} invoice={invoice} />;
  const blob = await pdf(doc).toBlob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
};

const waitForQueuedPdf = async (
  jobId: string,
  getQueueJobStatus: ReturnType<typeof useLazyGetQueueJobStatusQuery>[0]
): Promise<string | null> => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await getQueueJobStatus({ queue: "invoice-pdf", jobId }, true).unwrap();
    if (response.job?.state === "completed") return response.job.returnvalue?.pdfUrl ?? null;
    if (response.job?.state === "failed") throw new Error(response.job.failedReason ?? "Invoice PDF generation failed.");
    await sleep(2000);
  }
  return null;
};

const statusOptions: Array<{ label: string; value: InvoiceStatus | "ALL" }> = [
  { label: "All Invoices", value: "ALL" },
  { label: "Unpaid", value: "UNPAID" },
  { label: "Partial", value: "PARTIALLY_PAID" },
  { label: "Paid", value: "PAID" },
];

const normalizeSearch = (value: string): string => value.trim().toLowerCase();

export const InvoiceListPage = () => {
  const tenant = useAppSelector((state) => state.tenant.currentTenant);
  const hospitalName = tenant?.name ?? "Hospital";
  const hospitalAddress = tenant?.address ?? "";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailsInvoiceId, setDetailsInvoiceId] = useState<string | null>(null);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 250);

  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    error: invoicesError,
    refetch,
  } = useGetInvoicesQuery({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: patients = [] } = useGetPatientsQuery();

  const [createInvoice, { isLoading: isCreatingInvoice }] = useCreateInvoiceMutation();
  const [recordInvoicePayment, { isLoading: isRecordingPayment }] = useRecordInvoicePaymentMutation();
  const [generateInvoicePdf] = useGenerateInvoicePdfMutation();
  const [getQueueJobStatus] = useLazyGetQueueJobStatusQuery();

  const filteredInvoices = useMemo(() => {
    const needle = normalizeSearch(debouncedSearch);
    return invoices.filter((invoice) => {
      if (statusFilter !== "ALL" && invoice.status !== statusFilter) return false;
      if (!needle) return true;
      const haystack = `${invoice.invoiceNumber} ${invoice.patient.name} ${invoice.patient.mrn}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [debouncedSearch, invoices, statusFilter]);

  const statusCounts = useMemo(() => ({
    ALL: invoices.length,
    UNPAID: invoices.filter((invoice) => invoice.status === "UNPAID").length,
    PARTIALLY_PAID: invoices.filter((invoice) => invoice.status === "PARTIALLY_PAID").length,
    PAID: invoices.filter((invoice) => invoice.status === "PAID").length,
  }), [invoices]);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === detailsInvoiceId) ?? null,
    [detailsInvoiceId, invoices]
  );

  const handleGeneratePdf = async (invoice: InvoiceRecord) => {
    try {
      setErrorText(null);
      setSuccessText(null);
      setActiveInvoiceId(invoice.id);
      if (invoice.pdfUrl) {
        window.open(invoice.pdfUrl, "_blank", "noopener,noreferrer");
        return;
      }
      const queued = await generateInvoicePdf(invoice.id).unwrap();
      const generatedPdfUrl = queued.jobId ? await waitForQueuedPdf(queued.jobId, getQueueJobStatus) : null;
      if (generatedPdfUrl) {
        window.open(generatedPdfUrl, "_blank", "noopener,noreferrer");
        void refetch();
        return;
      }
      await openClientGeneratedPdf(invoice, hospitalName, hospitalAddress);
    } catch (error) {
      try {
        await openClientGeneratedPdf(invoice, hospitalName, hospitalAddress);
      } catch {
        setErrorText(parseApiError(error));
      }
    } finally {
      setActiveInvoiceId(null);
    }
  };

  const handleCreateInvoice = async (payload: CreateInvoiceRequest) => {
    try {
      setErrorText(null);
      setSuccessText(null);
      const response = await createInvoice(payload).unwrap();
      setSuccessText(response.message ?? "Invoice created successfully.");
    } catch (error) {
      throw new Error(parseApiError(error));
    }
  };

  const handleRecordPayment = async (payload: RecordInvoicePaymentRequest) => {
    try {
      setErrorText(null);
      setSuccessText(null);
      const response = await recordInvoicePayment(payload).unwrap();
      setSuccessText(response.message ?? "Payment recorded successfully.");
    } catch (error) {
      throw new Error(parseApiError(error));
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Stack spacing={4}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.03em", mb: 0.5 }}>
              Billing & Invoices
            </Typography>
            <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
              Manage patient billing, payments, and invoice records.
            </Typography>
          </Box>
          <Button
            variant="contained"
            disableElevation
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              borderRadius: "10px",
              px: 3,
              py: 1,
              fontWeight: 700,
              textTransform: "none",
              bgcolor: themeTokens.colors.primary,
              "&:hover": { bgcolor: "#004a89" }
            }}
          >
            Create Invoice
          </Button>
        </Stack>

        <Stack spacing={2}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: "20px",
              borderColor: "rgba(0,0,0,0.06)",
              bgcolor: "white",
            }}
          >
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  placeholder="Search by invoice #, patient name or MRN..."
                  fullWidth
                  size="small"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  label="From Date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><CalendarMonth fontSize="small" /></InputAdornment>,
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  label="To Date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><CalendarMonth fontSize="small" /></InputAdornment>,
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
              {statusOptions.map((statusOption) => (
                <Chip
                  key={statusOption.value}
                  label={`${statusOption.label} (${statusCounts[statusOption.value]})`}
                  onClick={() => setStatusFilter(statusOption.value)}
                  sx={{
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    bgcolor: statusFilter === statusOption.value ? themeTokens.colors.primary : "transparent",
                    color: statusFilter === statusOption.value ? "white" : "text.secondary",
                    borderColor: statusFilter === statusOption.value ? themeTokens.colors.primary : "rgba(0,0,0,0.1)",
                    "&:hover": { bgcolor: statusFilter === statusOption.value ? themeTokens.colors.primary : alpha(themeTokens.colors.primary, 0.04) },
                  }}
                  variant={statusFilter === statusOption.value ? "filled" : "outlined"}
                />
              ))}
            </Stack>
          </Paper>

          {(errorText || successText || invoicesError) && (
            <Alert severity={successText ? "success" : "error"} sx={{ borderRadius: "12px" }}>
              {successText || errorText || parseApiError(invoicesError)}
            </Alert>
          )}

          <Paper
            variant="outlined"
            sx={{
              borderRadius: "20px",
              borderColor: "rgba(0,0,0,0.06)",
              overflow: "hidden",
              bgcolor: "white",
            }}
          >
            <Box sx={{ overflowX: "auto" }}>
              <Table size="medium">
                <TableHead sx={{ bgcolor: alpha(themeTokens.colors.primary, 0.02) }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Invoice & Patient</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Issued At</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Total Amount</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Balance</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoadingInvoices ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
                  ) : filteredInvoices.map((invoice) => {
                    const isWorking = activeInvoiceId === invoice.id;
                    const balance = Math.max(Number(invoice.total) - Number(invoice.amountPaid), 0);
                    const statusColor = themeTokens.colors.status[invoice.status] || "text.secondary";
                    return (
                      <TableRow key={invoice.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ p: 1, borderRadius: "8px", bgcolor: alpha(themeTokens.colors.primary, 0.05), color: themeTokens.colors.primary }}>
                              <ReceiptLong fontSize="small" />
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>#{invoice.invoiceNumber}</Typography>
                              <Typography variant="caption" color="text.secondary">{invoice.patient.name} ({invoice.patient.mrn})</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={invoice.status.replace("_", " ")}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.65rem",
                              borderRadius: "6px",
                              bgcolor: alpha(statusColor, 0.06),
                              color: statusColor,
                              borderColor: alpha(statusColor, 0.2),
                            }}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{toDate(invoice.createdAt)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{toCurrency(invoice.total)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 800, color: balance > 0 ? "error.main" : "success.main" }}>
                            {balance === 0 ? "Settled" : toCurrency(String(balance))}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => setDetailsInvoiceId(invoice.id)}
                              sx={{ textTransform: "none", fontWeight: 700 }}
                            >
                              Details
                            </Button>
                            <IconButton
                              size="small"
                              aria-label={`Download invoice ${invoice?.id ?? ''}`}
                              onClick={() => void handleGeneratePdf(invoice)}
                              disabled={isWorking}
                              sx={{ color: themeTokens.colors.primary }}
                            >
                              {isWorking ? <CircularProgress size={16} color="inherit" /> : <Download fontSize="small" />}
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!isLoadingInvoices && filteredInvoices.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No invoices matching your criteria.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Stack>
      </Stack>

      <CreateInvoiceDialog
        open={createDialogOpen}
        patients={patients}
        isSubmitting={isCreatingInvoice}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateInvoice}
      />

      <InvoiceDetailsDrawer
        open={Boolean(detailsInvoiceId)}
        invoice={selectedInvoice}
        isSubmittingPayment={isRecordingPayment}
        onClose={() => setDetailsInvoiceId(null)}
        onRecordPayment={handleRecordPayment}
        onPrint={handleGeneratePdf}
      />
    </Box>
  );
};
