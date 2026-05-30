import { FC } from "react";
import {
  Box,
  Typography,
  Paper,
  alpha,
  Button,
  Stack,
  Container
} from "@mui/material";
import {
  LayersOutlined,
  AdminPanelSettingsOutlined,
  TerminalOutlined
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { tokens, glassmorphism } from "../theme/tokens";

export const ModulesPage: FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: tokens.colors.surface, minHeight: "100%" }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" sx={{ color: tokens.colors.onSurface, fontWeight: 900, letterSpacing: '-0.04em', mb: 1.5 }}>
            Platform Features
          </Typography>
          <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500, maxWidth: "40rem", lineHeight: 1.6 }}>
            MedCore is built on an industry-leading tech stack, engineered for extreme performance, security, and clinician happiness.
          </Typography>
        </Box>

        <Box sx={{ 
          display: "grid", 
          gap: 4, 
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }
        }}>
          <Paper elevation={0} sx={{ gridColumn: { md: "span 2" }, bgcolor: "#fff", p: { xs: 4, md: 6 }, borderRadius: "32px", border: `1px solid ${tokens.colors.outlineVariant}`, display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
            <Box>
              <Box sx={{ p: 2, borderRadius: "16px", bgcolor: alpha(tokens.colors.primary, 0.08), color: tokens.colors.primary, display: 'inline-flex', mb: 4 }}>
                <LayersOutlined sx={{ fontSize: 32 }} />
              </Box>
              <Typography variant="h4" sx={{ color: tokens.colors.onSurface, fontWeight: 800, letterSpacing: '-0.02em' }}>Native Multi-tenancy</Typography>
              <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 2, maxWidth: "32rem", lineHeight: 1.7, fontWeight: 500 }}>
                Manage multiple clinic locations, laboratories, and imaging centers from a single unified dashboard with cryptographic data isolation.
              </Typography>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 3, mt: 6 }}>
              <Box sx={{ bgcolor: alpha(tokens.colors.primary, 0.03), p: 2.5, borderRadius: "20px", border: `1px solid ${alpha(tokens.colors.primary, 0.1)}` }}>
                <Typography sx={{ display: "block", mb: 1.5, fontWeight: 800, fontSize: '0.7rem', color: tokens.colors.primary, letterSpacing: '0.1em' }}>DATA ISOLATION</Typography>
                <Box sx={{ height: 10, width: "100%", bgcolor: alpha(tokens.colors.primary, 0.1), borderRadius: "9999px", overflow: 'hidden' }}>
                  <Box sx={{ height: "100%", width: "100%", bgcolor: tokens.colors.primary, borderRadius: "9999px" }} />
                </Box>
              </Box>
              <Box sx={{ bgcolor: alpha(tokens.colors.secondary, 0.03), p: 2.5, borderRadius: "20px", border: `1px solid ${alpha(tokens.colors.secondary, 0.1)}` }}>
                <Typography sx={{ display: "block", mb: 1.5, fontWeight: 800, fontSize: '0.7rem', color: tokens.colors.secondary, letterSpacing: '0.1em' }}>NETWORK UPTIME</Typography>
                <Box sx={{ height: 10, width: "100%", bgcolor: alpha(tokens.colors.secondary, 0.1), borderRadius: "9999px", overflow: 'hidden' }}>
                  <Box sx={{ height: "100%", width: "99.99%", bgcolor: tokens.colors.secondary, borderRadius: "9999px" }} />
                </Box>
              </Box>
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ gridColumn: { md: "span 1" }, bgcolor: tokens.colors.primary, color: "#fff", p: { xs: 4, md: 6 }, borderRadius: "32px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", boxShadow: `0 20px 40px ${alpha(tokens.colors.primary, 0.25)}` }}>
            <AdminPanelSettingsOutlined sx={{ fontSize: 64, mb: 3, opacity: 0.9 }} />
            <Typography variant="h4" sx={{ color: "#fff", fontWeight: 800 }}>RBAC Mastery</Typography>
            <Typography sx={{ opacity: 0.8, mt: 2, fontWeight: 500, lineHeight: 1.6 }}>
              Granular Role-Based Access Control ensures every staff member sees only what is required.
            </Typography>
            <Button 
              component={RouterLink} 
              to="/security" 
              variant="contained"
              sx={{ 
                mt: 4, 
                bgcolor: "#fff", 
                color: tokens.colors.primary, 
                borderRadius: "14px", 
                px: 4, 
                py: 1.5,
                fontWeight: 800,
                textTransform: 'none',
                '&:hover': { bgcolor: alpha("#fff", 0.9) }
              }}
            >
              Setup Roles
            </Button>
          </Paper>

          <Paper elevation={0} sx={{ gridColumn: { md: "span 1" }, bgcolor: "#fff", p: { xs: 4, md: 5 }, borderRadius: "32px", border: `1px solid ${tokens.colors.outlineVariant}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Box sx={{ p: 1.5, borderRadius: "12px", bgcolor: alpha(tokens.colors.secondary, 0.08), color: tokens.colors.secondary, display: 'inline-flex', mb: 3, width: 'fit-content' }}>
              <TerminalOutlined sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h5" sx={{ color: tokens.colors.onSurface, fontWeight: 800 }}>Modern Tech Stack</Typography>
            <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 1.5, lineHeight: 1.6, fontWeight: 500 }}>
              Built with React, Node.js, and PostgreSQL for lightning fast response times and deep audit trails.
            </Typography>
          </Paper>

          <Paper elevation={0} sx={{ gridColumn: { md: "span 2" }, p: 4, borderRadius: "32px", ...glassmorphism, display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
            <Box sx={{ width: "35%", flexShrink: 0, display: { xs: "none", sm: "block" } }}>
              <Box component="img" alt="Clinician using the patient-centric portal" src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=400" sx={{ borderRadius: "24px", objectFit: "cover", aspectRatio: "1.4/1", width: "100%", boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ color: tokens.colors.onSurface, fontWeight: 800 }}>Patient-Centric Portal</Typography>
              <Typography sx={{ color: tokens.colors.onSurfaceVariant, mt: 1.5, fontWeight: 500, lineHeight: 1.6 }}>
                Self-service appointments, digital prescriptions, and instant lab results access for patients, reducing clinic overhead.
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  component={RouterLink}
                  to="/help-center"
                  sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700, px: 3 }}
                >
                  Learn More
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};
