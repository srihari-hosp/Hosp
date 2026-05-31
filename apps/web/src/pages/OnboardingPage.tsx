import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Radio,
  RadioGroup,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Stack,
  alpha,
  Grid,
} from "@mui/material";
import {
  LocalHospital,
  MedicalServices,
  SupervisorAccount,
  Person,
  Work,
  CheckCircle,
  Business,
  Tag,
} from "@mui/icons-material";

const themeTokens = {
  colors: {
    primary: "#005dac",
    secondary: "#9a25ae",
    background: "#f8f9fc",
    surface: "#ffffff",
    text: {
      primary: "#1a1c1e",
      secondary: "#44474e",
    },
  },
};

type WizardRole = "ADMIN" | "DOCTOR" | "NURSE" | "RECEPTIONIST";

type OnboardingPayload = {
  tenantName: string;
  tenantCode?: string;
  role: WizardRole;
};

type OnboardingPageProps = {
  initialTenantName?: string;
  initialTenantCode?: string;
  initialRole?: string;
  onComplete: (payload: OnboardingPayload) => void;
};

const steps = ["Institution Setup", "Role Definition"];

const normalizeRole = (value?: string): WizardRole => {
  if (value === "ADMIN" || value === "DOCTOR" || value === "NURSE" || value === "RECEPTIONIST") {
    return value;
  }
  return "ADMIN";
};

export const OnboardingPage = ({
  initialTenantName,
  initialTenantCode,
  initialRole,
  onComplete,
}: OnboardingPageProps) => {
  const [activeStep, setActiveStep] = useState(0);
  const [tenantName, setTenantName] = useState(initialTenantName ?? "");
  const [tenantCode, setTenantCode] = useState(initialTenantCode ?? "");
  const [role, setRole] = useState<WizardRole>(normalizeRole(initialRole));
  const [submitted, setSubmitted] = useState(false);

  const tenantNameValue = tenantName.trim();
  const tenantCodeValue = tenantCode.trim();
  const tenantNameError = submitted && tenantNameValue.length < 2;
  const canContinueTenantStep = tenantNameValue.length >= 2;

  const roleOptions = useMemo(
    () => [
      { 
        value: "ADMIN" as const, 
        title: "Administrator", 
        subtitle: "Governance & Infrastructure Control", 
        icon: <SupervisorAccount sx={{ fontSize: "1.5rem" }} /> 
      },
      { 
        value: "DOCTOR" as const, 
        title: "Clinical Practitioner", 
        subtitle: "Diagnostic & Surgical Excellence", 
        icon: <MedicalServices sx={{ fontSize: "1.5rem" }} /> 
      },
      { 
        value: "NURSE" as const, 
        title: "Clinical Support", 
        subtitle: "Patient Care & Vitals Management", 
        icon: <Person sx={{ fontSize: "1.5rem" }} /> 
      },
      {
        value: "RECEPTIONIST" as const,
        title: "Operations Staff",
        subtitle: "Registration & Billing Concierge",
        icon: <Work sx={{ fontSize: "1.5rem" }} />,
      },
    ],
    []
  );

  const handleNext = () => {
    setSubmitted(true);
    if (!canContinueTenantStep) return;
    setActiveStep(1);
    setSubmitted(false);
  };

  const handleFinish = () => {
    onComplete({
      tenantName: tenantNameValue,
      tenantCode: tenantCodeValue || undefined,
      role,
    });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: themeTokens.colors.background,
        background: `radial-gradient(circle at 100% 0%, ${alpha(themeTokens.colors.primary, 0.05)} 0%, transparent 40%)`,
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box
            sx={{
              display: "inline-flex",
              width: 44,
              height: 44,
              bgcolor: themeTokens.colors.primary,
              borderRadius: "12px",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              mb: 2,
              boxShadow: `0 8px 24px ${alpha(themeTokens.colors.primary, 0.2)}`,
            }}
          >
            <LocalHospital sx={{ fontSize: "1.5rem" }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
            Initialize MedCore
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Complete your profile to access the clinical ecosystem.
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.4)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.04)",
          }}
        >
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel
                  StepIconProps={{
                    sx: {
                      "&.Mui-active": { color: themeTokens.colors.primary },
                      "&.Mui-completed": { color: themeTokens.colors.primary },
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{label}</Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 ? (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>Institution Details</Typography>
                <TextField
                  label="Hospital / Clinic Name"
                  fullWidth
                  required
                  size="small"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  error={tenantNameError}
                  helperText={tenantNameError ? "Name is required for tenant generation." : ""}
                  InputProps={{
                    startAdornment: <Business sx={{ mr: 1, fontSize: "1.1rem", color: "text.secondary" }} />,
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#fff" } }}
                />
                <TextField
                  label="Identifier Code (Optional)"
                  fullWidth
                  size="small"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  placeholder="e.g. CLINIC-NY"
                  InputProps={{
                    startAdornment: <Tag sx={{ mr: 1, fontSize: "1.1rem", color: "text.secondary" }} />,
                  }}
                  sx={{ mt: 2, "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#fff" } }}
                />
              </Box>
              <Button
                variant="contained"
                fullWidth
                disableElevation
                onClick={handleNext}
                sx={{
                  py: 1.5,
                  borderRadius: "12px",
                  bgcolor: themeTokens.colors.primary,
                  fontWeight: 800,
                  textTransform: "none",
                  boxShadow: `0 8px 24px ${alpha(themeTokens.colors.primary, 0.2)}`,
                }}
              >
                Continue to Role Definition
              </Button>
            </Stack>
          ) : (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>Define Your Role</Typography>
              <RadioGroup value={role} onChange={(e) => setRole(normalizeRole(e.target.value))}>
                <Grid container spacing={1.5}>
                  {roleOptions.map((option) => (
                    <Grid size={{ xs: 12 }} key={option.value}>
                      <Paper
                        variant="outlined"
                        onClick={() => setRole(option.value)}
                        sx={{
                          p: 1.5,
                          borderRadius: "14px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          bgcolor: role === option.value ? alpha(themeTokens.colors.primary, 0.02) : "#fff",
                          borderColor: role === option.value ? themeTokens.colors.primary : alpha("rgba(0,0,0,0.1)", 1),
                          borderWidth: role === option.value ? 2 : 1,
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: "8px",
                            bgcolor: role === option.value ? themeTokens.colors.primary : alpha(themeTokens.colors.primary, 0.05),
                            color: role === option.value ? "#fff" : themeTokens.colors.primary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mr: 2,
                          }}
                        >
                          {option.icon}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{option.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{option.subtitle}</Typography>
                        </Box>
                        <Radio
                          value={option.value}
                          checked={role === option.value}
                          size="small"
                          sx={{ color: themeTokens.colors.primary }}
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </RadioGroup>

              <Alert
                icon={<CheckCircle sx={{ fontSize: "1rem" }} />}
                severity="success"
                sx={{ mt: 3, borderRadius: "10px", bgcolor: alpha("#4caf50", 0.05), border: "1px solid rgba(76, 175, 80, 0.1)", color: "#2e7d32", fontSize: "0.75rem" }}
              >
                Configuration can be modified later in profile settings.
              </Alert>

              <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setActiveStep(0)}
                  sx={{ borderRadius: "10px", fontWeight: 700, textTransform: "none", borderColor: "rgba(0,0,0,0.1)", color: "text.secondary" }}
                >
                  Back
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleFinish}
                  sx={{
                    borderRadius: "10px",
                    bgcolor: themeTokens.colors.primary,
                    fontWeight: 800,
                    textTransform: "none",
                    boxShadow: `0 8px 24px ${alpha(themeTokens.colors.primary, 0.2)}`,
                  }}
                >
                  Complete Setup
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};
