import { FC } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Stack,
  Paper,
  Button,
  alpha
} from "@mui/material";
import {
  ArrowBack,
  CodeOutlined,
  TerminalOutlined,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { tokens, glassmorphism } from "../theme/tokens";
import { PublicLayout } from "../components/layout/PublicLayout";

const ApiEndpoint = ({ method, path, description }: { method: string, path: string, description: string }) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      mb: 3,
      borderRadius: "16px",
      border: `1px solid ${tokens.colors.outlineVariant}`,
      bgcolor: "white",
      transition: "all 0.2s ease",
      "&:hover": { borderColor: tokens.colors.primary, boxShadow: "0 8px 16px rgba(0,0,0,0.04)" }
    }}
  >
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
      <Typography 
        variant="caption" 
        sx={{ 
          px: 1.5, 
          py: 0.5, 
          borderRadius: "6px", 
          bgcolor: method === "GET" ? "#2e7d32" : method === "POST" ? tokens.colors.primary : "#ed6c02",
          color: "white",
          fontWeight: 800,
          letterSpacing: "0.05em"
        }}
      >
        {method}
      </Typography>
      <Typography sx={{ fontFamily: "monospace", fontWeight: 800, fontSize: "0.95rem", color: tokens.colors.onSurface }}>{path}</Typography>
    </Stack>
    <Typography sx={{ fontSize: "0.875rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.6 }}>
      {description}
    </Typography>
  </Paper>
);

export const ApiDocsPage: FC = () => {
  return (
    <PublicLayout>
      <Box sx={{ 
        bgcolor: tokens.colors.surface, 
        minHeight: "100%", 
        py: 10,
        background: `radial-gradient(circle at 0% 0%, ${alpha(tokens.colors.primary, 0.05)} 0%, transparent 40%)`
      }}>
        <Container maxWidth="lg">
          <Button
            component={RouterLink}
            to="/landing"
            startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
            sx={{ mb: 6, textTransform: "none", fontWeight: 700, color: tokens.colors.onSurfaceVariant }}
          >
            Back to Home
          </Button>

          <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ position: "sticky", top: 120 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                  <Box sx={{ p: 1.5, borderRadius: "14px", bgcolor: alpha(tokens.colors.primary, 0.1), color: tokens.colors.primary, display: 'flex' }}>
                    <CodeOutlined sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.04em" }}>Developer API</Typography>
                </Stack>
                <Typography sx={{ color: tokens.colors.onSurfaceVariant, mb: 6, lineHeight: 1.7, fontWeight: 500 }}>
                  Integrate MedCore with your existing clinical tools. Our REST API provides full access to patients, billing, and pharmacy resources.
                </Typography>
                <Stack spacing={1}>
                  {["Authentication", "Patient Records", "Billing & Invoices", "Pharmacy Inventory", "Webhooks"].map((label, idx) => (
                    <Button 
                      key={label}
                      variant="text" 
                      sx={{ 
                        justifyContent: "flex-start", 
                        fontWeight: idx === 0 ? 800 : 600, 
                        color: idx === 0 ? tokens.colors.primary : tokens.colors.onSurfaceVariant,
                        px: 2,
                        py: 1.25,
                        borderRadius: '10px',
                        '&:hover': { bgcolor: alpha(tokens.colors.primary, 0.05), color: tokens.colors.primary }
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </Stack>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper elevation={0} sx={{ p: { xs: 4, md: 8 }, borderRadius: "32px", ...glassmorphism }}>
                <Typography variant="h5" sx={{ fontWeight: 900, mb: 5, letterSpacing: '-0.02em' }}>REST API Reference</Typography>
                
                <Box sx={{ mb: 8 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, color: tokens.colors.primary, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: '0.75rem' }}>Patient Endpoints</Typography>
                  <ApiEndpoint method="GET" path="/api/v1/patients" description="List all patients with optional filtering and pagination." />
                  <ApiEndpoint method="POST" path="/api/v1/patients" description="Create a new patient record in the system." />
                  <ApiEndpoint method="GET" path="/api/v1/patients/:id" description="Retrieve detailed clinical history for a specific patient." />
                </Box>

                <Box sx={{ mb: 8 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, color: tokens.colors.primary, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: '0.75rem' }}>Billing Endpoints</Typography>
                  <ApiEndpoint method="GET" path="/api/v1/invoices" description="List all invoices for the current tenant." />
                  <ApiEndpoint method="POST" path="/api/v1/invoices" description="Generate a new invoice from billable services." />
                </Box>

                <Box sx={{ p: 4, borderRadius: "24px", bgcolor: "#121416", color: "white", mt: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", textTransform: 'uppercase', letterSpacing: '0.1em' }}>Example Request</Typography>
                    <TerminalOutlined sx={{ fontSize: 20, opacity: 0.5 }} />
                  </Stack>
                  <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem", color: "#82aaff", lineHeight: 1.7 }}>
                    <span style={{ color: "#c792ea" }}>curl</span> -X GET <span style={{ color: "#c3e88d" }}>"https://api.medcore.com/v1/patients"</span> \<br />
                    &nbsp;&nbsp;-H <span style={{ color: "#c3e88d" }}>"Authorization: Bearer YOUR_API_KEY"</span> \<br />
                    &nbsp;&nbsp;-H <span style={{ color: "#c3e88d" }}>"Content-Type: application/json"</span>
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </PublicLayout>
  );
};
