import { useEffect, useMemo, useState } from "react";
import { LocalPharmacy, Search, WarningAmber, ShoppingBagOutlined, AccessTime } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
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
  Grid,
  CircularProgress,
} from "@mui/material";
import { DispenseFromPrescriptionModal } from "../components/pharmacy";
import { useDebounce } from "../hooks/useDebounce";
import {
  useGetMedicinesQuery,
  useLazyGetMedicineBatchesQuery,
  type MedicineRecord,
  type StockBatchRecord,
} from "../store/api";

const themeTokens = {
  colors: {
    primary: "#005dac",
    background: "#f8f9fc",
    status: {
      IN_STOCK: "#2e7d32",
      LOW_STOCK: "#ed6c02",
      OUT_OF_STOCK: "#d32f2f",
    }
  },
};

type StockStatusFilter = "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
type ExpiryFilter = "ALL" | "EXPIRING_30" | "EXPIRING_60";

type MedicineStockSummary = {
  medicine: MedicineRecord;
  totalAvailable: number;
  earliestExpiry: string | null;
  validBatchCount: number;
  isExpiringWithin30: boolean;
  isExpiringWithin60: boolean;
  stockStatus: Exclude<StockStatusFilter, "ALL">;
};

const parseApiError = (error: unknown): string => {
  if (!error || typeof error !== "object") return "Unable to process request.";
  const parsed = error as { status?: unknown; data?: { message?: string; error?: string } };
  if (parsed.status === "FETCH_ERROR") return "Unable to connect to API server.";
  return parsed.data?.message ?? parsed.data?.error ?? "Unable to process request.";
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

const getNonExpiredBatches = (batches: StockBatchRecord[]): StockBatchRecord[] => {
  const now = new Date();
  return batches.filter((batch) => batch.isActive && batch.availableQty > 0 && new Date(batch.expiryDate) >= now);
};

const summarizeMedicineStock = (medicine: MedicineRecord, batches: StockBatchRecord[]): MedicineStockSummary => {
  const nonExpiredBatches = getNonExpiredBatches(batches);
  const totalAvailable = nonExpiredBatches.reduce((acc, batch) => acc + batch.availableQty, 0);
  const earliestExpiryBatch =
    nonExpiredBatches.length > 0
      ? nonExpiredBatches
          .slice()
          .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0]
      : null;

  const now = new Date();
  const thirtyDays = new Date(now);
  thirtyDays.setDate(now.getDate() + 30);
  const sixtyDays = new Date(now);
  sixtyDays.setDate(now.getDate() + 60);

  let stockStatus: MedicineStockSummary["stockStatus"] = "OUT_OF_STOCK";
  if (totalAvailable > 10) {
    stockStatus = "IN_STOCK";
  } else if (totalAvailable > 0) {
    stockStatus = "LOW_STOCK";
  }

  const earliestExpiryDate = earliestExpiryBatch ? new Date(earliestExpiryBatch.expiryDate) : null;

  return {
    medicine,
    totalAvailable,
    earliestExpiry: earliestExpiryBatch?.expiryDate ?? null,
    validBatchCount: nonExpiredBatches.length,
    isExpiringWithin30: Boolean(earliestExpiryDate && earliestExpiryDate <= thirtyDays),
    isExpiringWithin60: Boolean(earliestExpiryDate && earliestExpiryDate <= sixtyDays),
    stockStatus,
  };
};

export const MedicineListPage = () => {
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockStatusFilter>("ALL");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("ALL");
  const [batchesByMedicine, setBatchesByMedicine] = useState<Record<string, StockBatchRecord[]>>({});
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [activeMedicineId, setActiveMedicineId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 250);
  const {
    data: medicines = [],
    isLoading: isLoadingMedicines,
    error: medicinesError,
    refetch,
  } = useGetMedicinesQuery({
    isActive: true,
    search: debouncedSearch.trim() || undefined,
  });
  const [getMedicineBatches] = useLazyGetMedicineBatchesQuery();

  useEffect(() => {
    if (medicines.length === 0) {
      setBatchesByMedicine({});
      return;
    }
    let isCurrent = true;
    const loadBatches = async () => {
      const results = await Promise.allSettled(
        medicines.map(async (medicine) => {
          const batches = await getMedicineBatches({ medicineId: medicine.id, includeExpired: true }, true).unwrap();
          return [medicine.id, batches] as const;
        })
      );
      if (!isCurrent) return;

      const successfulEntries = [];
      const errors = [];

      for (const result of results) {
        if (result.status === "fulfilled") {
          successfulEntries.push(result.value);
        } else {
          errors.push(result.reason);
        }
      }

      setBatchesByMedicine(Object.fromEntries(successfulEntries));

      if (errors.length > 0) {
        setErrorText(parseApiError(errors[0]));
      } else {
        setErrorText(null);
      }
    };
    void loadBatches();
    return () => { isCurrent = false; };
  }, [getMedicineBatches, medicines]);

  const summaries = useMemo(
    () => medicines.map((medicine) => summarizeMedicineStock(medicine, batchesByMedicine[medicine.id] ?? [])),
    [batchesByMedicine, medicines]
  );

  const filteredSummaries = useMemo(() => {
    return summaries.filter((summary) => {
      const stockMatch = stockFilter === "ALL" || summary.stockStatus === stockFilter;
      const expiryMatch =
        expiryFilter === "ALL" ||
        (expiryFilter === "EXPIRING_30" && summary.isExpiringWithin30) ||
        (expiryFilter === "EXPIRING_60" && summary.isExpiringWithin60);
      return stockMatch && expiryMatch;
    });
  }, [expiryFilter, stockFilter, summaries]);

  const stockCounts = useMemo(
    () => ({
      ALL: summaries.length,
      IN_STOCK: summaries.filter((entry) => entry.stockStatus === "IN_STOCK").length,
      LOW_STOCK: summaries.filter((entry) => entry.stockStatus === "LOW_STOCK").length,
      OUT_OF_STOCK: summaries.filter((entry) => entry.stockStatus === "OUT_OF_STOCK").length,
    }),
    [summaries]
  );

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Stack spacing={4}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.03em", mb: 0.5 }}>
              Pharmacy Inventory
            </Typography>
            <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
              Track medicine stock, expiry dates, and dispense prescriptions.
            </Typography>
          </Box>
          <Button
            variant="contained"
            disableElevation
            startIcon={<LocalPharmacy />}
            onClick={() => {
              setActiveMedicineId(null);
              setDispenseOpen(true);
            }}
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
            Dispense From Prescription
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
              <Grid size={{ xs: 12, md: 7 }}>
                <TextField
                  placeholder="Search medicine by name, generic name or code..."
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
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Expiry Visibility"
                  value={expiryFilter}
                  onChange={e => setExpiryFilter(e.target.value as ExpiryFilter)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><AccessTime fontSize="small" /></InputAdornment>,
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                >
                  <MenuItem value="ALL">All Medicines</MenuItem>
                  <MenuItem value="EXPIRING_30">Expiring in 30 days</MenuItem>
                  <MenuItem value="EXPIRING_60">Expiring in 60 days</MenuItem>
                </TextField>
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
              {(["ALL", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"] as StockStatusFilter[]).map((status) => (
                <Chip
                  key={status}
                  label={`${status.replace(/_/g, " ")} (${stockCounts[status]})`}
                  onClick={() => setStockFilter(status)}
                  sx={{
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    bgcolor: stockFilter === status ? themeTokens.colors.primary : "transparent",
                    color: stockFilter === status ? "white" : "text.secondary",
                    borderColor: stockFilter === status ? themeTokens.colors.primary : "rgba(0,0,0,0.1)",
                    "&:hover": { bgcolor: stockFilter === status ? themeTokens.colors.primary : alpha(themeTokens.colors.primary, 0.04) },
                  }}
                  variant={stockFilter === status ? "filled" : "outlined"}
                />
              ))}
            </Stack>
          </Paper>

          {(errorText || medicinesError) && (
            <Alert severity="error" sx={{ borderRadius: "12px" }}>
              {errorText || parseApiError(medicinesError)}
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
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Medicine & Code</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Schedule</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Unit Price</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Stock</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Earliest Expiry</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoadingMedicines ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
                  ) : filteredSummaries.map((summary) => {
                    const statusColor = themeTokens.colors.status[summary.stockStatus];
                    const isLowStock = summary.stockStatus === "LOW_STOCK";
                    const isOutOfStock = summary.stockStatus === "OUT_OF_STOCK";
                    const isExpiring = summary.isExpiringWithin30;

                    return (
                      <TableRow key={summary.medicine.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ p: 1, borderRadius: "8px", bgcolor: alpha(themeTokens.colors.primary, 0.05), color: themeTokens.colors.primary }}>
                              <ShoppingBagOutlined fontSize="small" />
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{summary.medicine.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {summary.medicine.code} {summary.medicine.genericName ? `• ${summary.medicine.genericName}` : ""}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>{summary.medicine.scheduleCategory}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{toCurrency(summary.medicine.unitPrice)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                            <Typography variant="body2" sx={{ fontWeight: 800, color: isOutOfStock ? "error.main" : isLowStock ? "warning.main" : "text.primary" }}>
                              {summary.totalAvailable}
                            </Typography>
                            {isLowStock && <WarningAmber sx={{ fontSize: 14, color: "warning.main" }} />}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: isExpiring ? "error.main" : "text.primary" }}>
                              {toDate(summary.earliestExpiry)}
                            </Typography>
                            {isExpiring && (
                              <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700, display: "block", fontSize: "0.6rem" }}>
                                EXPIRING SOON
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={summary.stockStatus.replace(/_/g, " ")}
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
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="text"
                            disabled={isOutOfStock}
                            onClick={() => {
                              setActiveMedicineId(summary.medicine.id);
                              setDispenseOpen(true);
                            }}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                          >
                            Dispense
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!isLoadingMedicines && filteredSummaries.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No medicines matching your criteria.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Stack>
      </Stack>

      <DispenseFromPrescriptionModal
        open={dispenseOpen}
        medicines={medicines}
        defaultMedicineId={activeMedicineId}
        onClose={() => setDispenseOpen(false)}
        onDispensed={() => {
          setErrorText(null);
          void refetch();
        }}
      />
    </Box>
  );
};
