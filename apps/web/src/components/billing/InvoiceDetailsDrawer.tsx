import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
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
} from "@mui/material";
import type { InvoiceRecord, PaymentRecord } from "../../store/api";

type InvoiceDetailsDrawerProps = {
  invoice: InvoiceRecord | null;
  open: boolean;
  isSubmittingPayment: boolean;
  onClose: () => void;
  onRecordPayment: (payload: {
    id: string;
    amount: number;
    method: PaymentRecord["method"];
    referenceNo?: string;
    notes?: string;
  }) => Promise<void>;
  onPrint: (invoice: InvoiceRecord) => Promise<void>;
};

const toCurrency = (value: string): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(numeric);
};

const toDateTime = (value?: string | null): string => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const statusChipColor: Record<InvoiceRecord["status"], "default" | "warning" | "success"> = {
  UNPAID: "default",
  PARTIALLY_PAID: "warning",
  PAID: "success",
};

export const InvoiceDetailsDrawer = ({
  invoice,
  open,
  isSubmittingPayment,
  onClose,
  onRecordPayment,
  onPrint,
}: InvoiceDetailsDrawerProps) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentRecord["method"]>("CASH");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const balance = useMemo(() => {
    if (!invoice) {
      return 0;
    }
    const total = Number(invoice.total);
    const paid = Number(invoice.amountPaid);
    if (!Number.isFinite(total) || !Number.isFinite(paid)) {
      return 0;
    }
    return Math.max(total - paid, 0);
  }, [invoice]);

  const amountValue = Number(amount);
  const isAmountValid = Number.isFinite(amountValue) && amountValue > 0 && amountValue <= balance;

  const handleClose = () => {
    if (isSubmittingPayment) {
      return;
    }
    onClose();
    setAmount("");
    setMethod("CASH");
    setReferenceNo("");
    setNotes("");
    setSubmitAttempted(false);
    setErrorText(null);
  };

  const handleSubmitPayment = async () => {
    if (!invoice) {
      return;
    }
    setSubmitAttempted(true);
    setErrorText(null);
    if (!isAmountValid) {
      return;
    }

    try {
      await onRecordPayment({
        id: invoice.id,
        amount: amountValue,
        method,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setAmount("");
      setReferenceNo("");
      setNotes("");
      setSubmitAttempted(false);
    } catch (error) {
      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText("Unable to record payment.");
      }
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={handleClose}>
      <Box sx={{ width: { xs: "100vw", sm: 580 }, p: 2.5 }}>
        {!invoice ? null : (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Box>
                <Typography variant="h6">{invoice.invoiceNumber}</Typography>
                <Typography color="text.secondary">
                  {invoice.patient.name} ({invoice.patient.mrn})
                </Typography>
              </Box>
              <Chip label={invoice.status} color={statusChipColor[invoice.status]} />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="h6">{toCurrency(invoice.total)}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Paid
                </Typography>
                <Typography variant="h6">{toCurrency(invoice.amountPaid)}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Balance
                </Typography>
                <Typography variant="h6">{toCurrency(balance.toFixed(2))}</Typography>
              </Paper>
            </Stack>

            <Button variant="outlined" onClick={() => void onPrint(invoice)}>
              Print Invoice
            </Button>

            <Divider />

            <Box>
              <Typography variant="subtitle1">Payment History</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{toDateTime(payment.receivedAt)}</TableCell>
                      <TableCell>
                        {payment.method}
                        {payment.referenceNo ? ` (${payment.referenceNo})` : ""}
                      </TableCell>
                      <TableCell align="right">{toCurrency(payment.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {invoice.payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography color="text.secondary">No payments recorded.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Box>

            <Divider />

            <Stack spacing={1.5}>
              <Typography variant="subtitle1">Record Payment</Typography>
              {errorText ? <Alert severity="error">{errorText}</Alert> : null}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  type="number"
                  label="Amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputProps={{ min: 0.01, max: balance, step: "0.01" }}
                  error={submitAttempted && !isAmountValid}
                  helperText={
                    submitAttempted && !isAmountValid ? `Enter amount > 0 and <= ${balance.toFixed(2)}.` : ""
                  }
                  fullWidth
                />
                <TextField select label="Method" value={method} onChange={(event) => setMethod(event.target.value as PaymentRecord["method"])} fullWidth>
                  <MenuItem value="CASH">Cash</MenuItem>
                  <MenuItem value="CARD">Card</MenuItem>
                  <MenuItem value="UPI">UPI</MenuItem>
                  <MenuItem value="NET_BANKING">Net Banking</MenuItem>
                  <MenuItem value="WALLET">Wallet</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </TextField>
              </Stack>
              <TextField
                label="Reference Number"
                value={referenceNo}
                onChange={(event) => setReferenceNo(event.target.value)}
                fullWidth
              />
              <TextField label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} minRows={2} multiline />
              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button onClick={handleClose} disabled={isSubmittingPayment}>
                  Close
                </Button>
                <Button variant="contained" onClick={() => void handleSubmitPayment()} disabled={isSubmittingPayment || balance <= 0}>
                  {isSubmittingPayment ? "Saving..." : "Record Payment"}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        )}
      </Box>
    </Drawer>
  );
};
