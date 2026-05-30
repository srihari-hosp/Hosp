import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
  Grid,
  InputAdornment,
  Chip,
} from "@mui/material";
import {
  Security,
  LockOutlined,
  VerifiedUser,
  History,
  VpnKey,
} from "@mui/icons-material";
import {
  useDisableMfaMutation,
  useEnableMfaMutation,
  useGetMeQuery,
  useLazyGenerateBackupCodesQuery,
  useSetupMfaMutation,
  useVerifyMfaMutation,
} from "../store/api";
import { tokens, glassmorphism } from "../theme/tokens";

const parseApiError = (error: unknown): string => {
  if (!error || typeof error !== "object") return "Request failed";
  const parsed = error as { status?: unknown; data?: { message?: string; error?: string } };
  if (parsed.status === "FETCH_ERROR") return "Unable to connect to API server.";
  return parsed.data?.message ?? parsed.data?.error ?? "Request failed";
};

export const MFASetupPage = () => {
  const { data: meData, refetch } = useGetMeQuery();
  const [setupMfa, { isLoading: isSettingUp }] = useSetupMfaMutation();
  const [verifyMfa, { isLoading: isVerifying }] = useVerifyMfaMutation();
  const [enableMfa, { isLoading: isEnabling }] = useEnableMfaMutation();
  const [disableMfa, { isLoading: isDisabling }] = useDisableMfaMutation();
  const [generateBackupCodes, { isLoading: isGenerating }] = useLazyGenerateBackupCodesQuery();

  const [code, setCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const onSetup = async () => {
    setErrorText(null);
    setSuccessText(null);
    setBackupCodes([]);
    setIsVerified(false);
    try {
      const response = await setupMfa().unwrap();
      setQrCodeDataUrl(response.qrCodeDataUrl);
      setSecret(response.secret);
      setSuccessText("Scan the QR code in your authenticator app, then verify.");
    } catch (error) {
      setErrorText(parseApiError(error));
    }
  };

  const onVerify = async () => {
    setErrorText(null);
    setSuccessText(null);
    try {
      const response = await verifyMfa({ code: code.trim() }).unwrap();
      if (!response.verified) {
        setErrorText("Invalid verification code.");
        return;
      }
      setIsVerified(true);
      setSuccessText("Code verified. You can now enable MFA.");
    } catch (error) {
      setErrorText(parseApiError(error));
    }
  };

  const onEnable = async () => {
    setErrorText(null);
    setSuccessText(null);
    try {
      const response = await enableMfa({ code: code.trim() }).unwrap();
      setBackupCodes(response.backupCodes ?? []);
      setSuccessText("MFA enabled successfully. Save these backup codes securely.");
      await refetch();
    } catch (error) {
      setErrorText(parseApiError(error));
    }
  };

  const onDisable = async () => {
    setErrorText(null);
    setSuccessText(null);
    try {
      await disableMfa().unwrap();
      setQrCodeDataUrl(null);
      setSecret(null);
      setBackupCodes([]);
      setCode("");
      setIsVerified(false);
      setSuccessText("MFA disabled.");
      await refetch();
    } catch (error) {
      setErrorText(parseApiError(error));
    }
  };

  const onRegenerateBackupCodes = async () => {
    setErrorText(null);
    setSuccessText(null);
    try {
      const response = await generateBackupCodes().unwrap();
      setBackupCodes(response.backupCodes ?? []);
      setSuccessText("Backup codes regenerated.");
    } catch (error) {
      setErrorText(parseApiError(error));
    }
  };

  const mfaEnabled = Boolean(meData?.mfaEnabled);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: tokens.colors.surface, minHeight: '100%' }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.04em", mb: 0.5 }}>
            Security Settings
          </Typography>
          <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>
            Enhance your account security with multi-factor authentication.
          </Typography>
        </Box>

        {(errorText || successText) && (
          <Alert severity={successText ? "success" : "error"} sx={{ borderRadius: "16px", fontWeight: 600 }}>
            {successText || errorText}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: "32px", border: `1px solid ${tokens.colors.outlineVariant}`, bgcolor: "white" }}>
              <Stack spacing={4}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ p: 2, borderRadius: "16px", bgcolor: alpha(tokens.colors.primary, 0.08), color: tokens.colors.primary, display: 'flex' }}>
                      <VerifiedUser fontSize="medium" />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>MFA Configuration</Typography>
                  </Stack>
                  <Chip
                    label={mfaEnabled ? "ENABLED" : "DISABLED"}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.7rem",
                      borderRadius: "8px",
                      bgcolor: alpha(mfaEnabled ? "#2e7d32" : "#d32f2f", 0.08),
                      color: mfaEnabled ? "#2e7d32" : "#d32f2f",
                      border: `1px solid ${alpha(mfaEnabled ? "#2e7d32" : "#d32f2f", 0.2)}`,
                    }}
                    variant="outlined"
                  />
                </Stack>

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    disableElevation
                    onClick={onSetup}
                    disabled={isSettingUp || mfaEnabled}
                    sx={{ borderRadius: "14px", px: 4, py: 1.5, fontWeight: 700, textTransform: "none", bgcolor: tokens.colors.primary }}
                  >
                    {isSettingUp ? "Generating..." : "Configure New MFA"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={onDisable}
                    disabled={!mfaEnabled || isDisabling}
                    sx={{ borderRadius: "14px", px: 4, py: 1.5, fontWeight: 700, textTransform: "none" }}
                  >
                    {isDisabling ? "Disabling..." : "Disable Security"}
                  </Button>
                </Stack>

                {qrCodeDataUrl && (
                  <Box sx={{ p: 4, bgcolor: alpha(tokens.colors.primary, 0.02), borderRadius: "24px", border: `1px dashed ${alpha(tokens.colors.primary, 0.2)}` }}>
                    <Grid container spacing={4} alignItems="center">
                      <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex", justifyContent: "center" }}>
                        <Box
                          component="img"
                          src={qrCodeDataUrl}
                          alt="MFA QR"
                          sx={{ width: 200, height: 200, borderRadius: "20px", p: 2, bgcolor: "white", boxShadow: "0 12px 24px rgba(0,0,0,0.08)" }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 7 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.01em' }}>Scan with Authenticator</Typography>
                        <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant, mb: 3, lineHeight: 1.6 }}>
                          Use Google Authenticator, Authy or any TOTP app to scan this code. This links your MedCore account to your physical device.
                        </Typography>
                        {secret && (
                          <Box sx={{ p: 2, bgcolor: "white", borderRadius: "12px", border: `1px solid ${tokens.colors.outlineVariant}` }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: tokens.colors.onSurfaceVariant, display: "block", mb: 0.5, fontSize: '0.65rem', textTransform: 'uppercase' }}>Manual Secret Key</Typography>
                            <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, letterSpacing: "0.15em", color: tokens.colors.onSurface, fontSize: '0.9rem' }}>{secret}</Typography>
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                  </Box>
                )}

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Stack spacing={2.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: '0.05em', color: tokens.colors.primary }}>VERIFY & ACTIVATE</Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      placeholder="6-digit code"
                      size="medium"
                      value={code}
                      onChange={e => {
                        setCode(e.target.value);
                        if (isVerified) setIsVerified(false);
                      }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlined fontSize="small" /></InputAdornment> }}
                      sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
                    />
                    <Button
                      onClick={onVerify}
                      variant="outlined"
                      disabled={!qrCodeDataUrl || isVerifying || isVerified}
                      sx={{ borderRadius: "14px", fontWeight: 700, textTransform: "none", px: 3 }}
                    >
                      {isVerifying ? "Checking..." : isVerified ? "Code Verified" : "Verify Code"}
                    </Button>
                    <Button
                      onClick={onEnable}
                      variant="contained"
                      disabled={!isVerified || isEnabling || mfaEnabled}
                      sx={{ borderRadius: "14px", fontWeight: 700, textTransform: "none", px: 3, bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" } }}
                    >
                      {isEnabling ? "Activating..." : "Enable Security"}
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: "32px", ...glassmorphism, height: "100%" }}>
              <Stack spacing={4}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ p: 1.5, borderRadius: "12px", bgcolor: alpha(tokens.colors.secondary, 0.08), color: tokens.colors.secondary, display: 'flex' }}>
                    <VpnKey fontSize="medium" />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>Backup Access</Typography>
                </Stack>
                
                <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant, lineHeight: 1.6, fontWeight: 500 }}>
                  In the event you lose access to your primary authenticator device, these one-time recovery codes will grant you access. Store them in a secure, physical location.
                </Typography>

                <Button
                  variant="outlined"
                  startIcon={<History />}
                  onClick={onRegenerateBackupCodes}
                  disabled={!mfaEnabled || isGenerating}
                  sx={{ borderRadius: "14px", py: 1.5, fontWeight: 700, textTransform: "none", borderColor: tokens.colors.outlineVariant, color: tokens.colors.onSurface }}
                >
                  {isGenerating ? "Regenerating..." : "Regenerate Backup Codes"}
                </Button>

                {backupCodes.length > 0 ? (
                  <Box sx={{ p: 3, bgcolor: alpha(tokens.colors.secondary, 0.03), borderRadius: "24px", border: `1px solid ${alpha(tokens.colors.secondary, 0.1)}` }}>
                    <Grid container spacing={2}>
                      {backupCodes.map((item) => (
                        <Grid size={{ xs: 6 }} key={item}>
                          <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: "0.95rem", color: tokens.colors.onSurface, textAlign: "center" }}>
                            {item}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ) : (
                  <Box sx={{ py: 8, textAlign: "center", bgcolor: alpha(tokens.colors.onSurface, 0.03), borderRadius: "24px", border: `1px dashed ${tokens.colors.outlineVariant}` }}>
                    <Security sx={{ fontSize: 48, color: tokens.colors.outlineVariant, mb: 2, opacity: 0.5 }} />
                    <Typography sx={{ display: "block", color: tokens.colors.onSurfaceVariant, fontWeight: 700, fontSize: '0.8rem' }}>
                      Enable MFA to view recovery codes
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{ mt: 'auto', p: 3, borderRadius: '20px', bgcolor: alpha(tokens.colors.primary, 0.05), border: `1px solid ${alpha(tokens.colors.primary, 0.1)}` }}>
                  <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.primary, fontWeight: 800, textTransform: 'uppercase', mb: 1 }}>Security Tip:</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: tokens.colors.onSurfaceVariant, lineHeight: 1.5 }}>
                    Never share your backup codes or verification secrets with anyone, including MedCore support personnel.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};
