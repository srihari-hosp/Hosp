import { FC } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  alpha,
  Button,
} from "@mui/material";
import {
  MedicationOutlined,
  BiotechOutlined,
  HealthAndSafetyOutlined,
  SettingsAccessibilityOutlined,
  ArrowBack
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { tokens } from "../theme/tokens";
import { PublicLayout } from "../components/layout/PublicLayout";

export const DepartmentsPage: FC = () => {
  return (
    <PublicLayout>
      <Box sx={{ 
        bgcolor: tokens.colors.surface, 
        minHeight: "100%", 
        py: 10,
        background: `radial-gradient(circle at 100% 100%, ${alpha(tokens.colors.primary, 0.05)} 0%, transparent 40%)`
      }}>
        <Container maxWidth="xl">
          <Box sx={{ mb: 6 }}>
            <Button
              component={RouterLink}
              to="/landing"
              startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
              sx={{ mb: 3, textTransform: "none", fontWeight: 600, color: tokens.colors.onSurfaceVariant, fontSize: "0.875rem" }}
            >
              Back to Home
            </Button>
            <Typography variant="h2" sx={{ fontWeight: 900, letterSpacing: "-0.04em", mb: 2 }}>
              Specialized Departments
            </Typography>
            <Typography sx={{ fontSize: "1.125rem", color: tokens.colors.onSurfaceVariant, maxWidth: "36rem" }}>
              Custom-tailored modules for every hospital wing, sharing one central source of truth.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {[
              { title: "Pharmacy", icon: <MedicationOutlined />, desc: "Real-time inventory, batch tracking, and e-prescription fulfillment.", tag: "STOCK READY" },
              { title: "Laboratory", icon: <BiotechOutlined />, desc: "LIS integration, automated reporting, and specimen lifecycle tracking.", tag: "HL7 COMPLIANT" },
              { title: "ER & Triage", icon: <HealthAndSafetyOutlined />, desc: "Rapid intake, priority queuing, and real-time bed management.", tag: "24/7 AUTO-SYNC" },
              { title: "Radiology", icon: <SettingsAccessibilityOutlined />, desc: "DICOM imaging support, PACS integration, and remote specialist access.", tag: "IMAGE SECURE" },
            ].map((dept) => (
              <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={dept.title}>
                <Paper sx={{ 
                  p: 4, 
                  height: "100%", 
                  display: "flex", 
                  flexDirection: "column", 
                  borderRadius: "24px", 
                  bgcolor: "white", 
                  border: `1px solid ${tokens.colors.outlineVariant}`, 
                  transition: "all 0.3s ease", 
                  cursor: "pointer", 
                  "&:hover": { 
                    borderColor: tokens.colors.primary, 
                    boxShadow: "0 10px 20px rgba(0, 0, 0, 0.05)",
                    transform: "translateY(-4px)"
                  }, 
                  "&:hover .icon-box": { 
                    bgcolor: tokens.colors.primary, 
                    color: "white" 
                  } 
                }}>
                  <Box className="icon-box" sx={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: "16px", 
                    bgcolor: alpha(tokens.colors.primary, 0.06), 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    mb: 3, 
                    transition: "all 0.2s", 
                    color: tokens.colors.primary 
                  }}>
                    {dept.icon}
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", color: tokens.colors.onSurface, mb: 1.5 }}>{dept.title}</Typography>
                  <Typography sx={{ fontSize: "0.875rem", color: tokens.colors.onSurfaceVariant, mb: 3, flexGrow: 1, lineHeight: 1.6 }}>{dept.desc}</Typography>
                  <Box sx={{ mt: "auto", display: "flex" }}>
                    <Typography sx={{ 
                      px: 1.5, 
                      py: 0.5, 
                      borderRadius: "6px", 
                      bgcolor: tokens.colors.surfaceContainer, 
                      color: tokens.colors.onSurface, 
                      fontSize: "10px", 
                      fontWeight: 700,
                      letterSpacing: "0.05em"
                    }}>
                      {dept.tag}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </PublicLayout>
  );
};
