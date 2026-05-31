import { useMemo } from "react";
import { Alert, Box, Button, Paper, Stack, Typography, alpha, Grid } from "@mui/material";
import { CloudDownload, PrivacyTip, History, Storage, PersonOutline } from "@mui/icons-material";
import { useExportMyDataMutation } from "../store/api";
import { tokens, glassmorphism } from "../theme/tokens";

const buildDownloadName = (userId?: string): string => {
  const today = new Date().toISOString().slice(0, 10);
  return `medcore-export-${userId ?? "user"}-${today}.json`;
};

export const ExportMyDataPage = () => {
  const [exportData, { data, isLoading, error }] = useExportMyDataMutation();

  const errorMessage = useMemo(() => {
    if (!error) return null;
    if ("status" in error && error.status === "FETCH_ERROR") return "Unable to connect to API server.";
    if ("status" in error) return `Request failed: ${error.status}`;
    return (error as { message?: string }).message ?? "Failed to load export data.";
  }, [error]);

  const handleDownload = async () => {
    const result = await exportData();
    const payload = result.data ?? data;
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildDownloadName(payload.user?.id);
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: tokens.colors.surface, minHeight: '100%' }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.04em", mb: 0.5 }}>
            Privacy & Data
          </Typography>
          <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>
            Manage your personal data and account export settings.
          </Typography>
        </Box>

        {errorMessage && (
          <Alert severity="error" sx={{ borderRadius: "16px" }}>
            {errorMessage}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={{ p: 5, borderRadius: "32px", border: `1px solid ${tokens.colors.outlineVariant}`, bgcolor: "white" }}>
              <Stack spacing={4}>
                <Stack direction="row" spacing={3} alignItems="center">
                  <Box sx={{ p: 2, borderRadius: "16px", bgcolor: alpha(tokens.colors.primary, 0.08), color: tokens.colors.primary, display: 'flex' }}>
                    <CloudDownload fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Account Data Export</Typography>
                    <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant }}>
                      Download a complete copy of your profile, clinical history, and system logs.
                    </Typography>
                  </Box>
                </Stack>

                <Box sx={{ p: 3, bgcolor: alpha(tokens.colors.primary, 0.03), borderRadius: "20px", border: `1px dashed ${alpha(tokens.colors.primary, 0.2)}` }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: "flex", alignItems: "center", gap: 1.5, color: tokens.colors.primary }}>
                    <PrivacyTip sx={{ fontSize: 20 }} />
                    Data Portability Notice
                  </Typography>
                  <Typography variant="body2" sx={{ color: tokens.colors.onSurfaceVariant, lineHeight: 1.6 }}>
                    Your export will be generated as a machine-readable JSON file. This includes sensitive medical record references and personal identifying information. Handle with care.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  disableElevation
                  startIcon={<CloudDownload />}
                  onClick={handleDownload}
                  disabled={isLoading}
                  sx={{
                    borderRadius: "14px",
                    py: 2,
                    fontWeight: 700,
                    textTransform: "none",
                    bgcolor: tokens.colors.primary,
                    "&:hover": { bgcolor: tokens.colors.primaryContainer }
                  }}
                >
                  {isLoading ? "Preparing secure package..." : "Generate & Download JSON Export"}
                </Button>

                {data?.exportedAt && (() => {
                  const d = new Date(data.exportedAt);
                  return isNaN(d.getTime()) ? null : (
                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                      <History sx={{ fontSize: 16, color: tokens.colors.onSurfaceVariant, opacity: 0.5 }} />
                      <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 700, fontSize: '0.75rem', opacity: 0.7 }}>
                        LAST EXPORTED: {d.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}
                      </Typography>
                    </Stack>
                  );
                })()}
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: "32px", ...glassmorphism, height: "100%" }}>
              <Stack spacing={4}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.125rem' }}>What's included in the package?</Typography>
                <Stack spacing={3}>
                  {[
                    { icon: <PersonOutline />, label: "Personal Profile", detail: "Name, email, and contact details" },
                    { icon: <Storage />, label: "System Preferences", detail: "Theme, timezone, and MFA settings" },
                    { icon: <History />, label: "Activity Audit", detail: "Login history and action logs" },
                  ].map((item, idx) => (
                    <Stack key={idx} direction="row" spacing={2.5} alignItems="center">
                      <Box sx={{ p: 1.5, borderRadius: "12px", bgcolor: alpha(tokens.colors.onSurface, 0.04), color: tokens.colors.onSurfaceVariant, display: 'flex' }}>
                        {item.icon}
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>{item.label}</Typography>
                        <Typography variant="caption" sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>{item.detail}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
                
                <Box sx={{ mt: 'auto', p: 2.5, borderRadius: '16px', bgcolor: alpha(tokens.colors.secondary, 0.05), border: `1px solid ${alpha(tokens.colors.secondary, 0.1)}` }}>
                  <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.secondary, fontWeight: 700 }}>
                    HIPAA Compliance Note:
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: tokens.colors.onSurfaceVariant, mt: 0.5 }}>
                    This export complies with HIPAA Right of Access requirements.
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
