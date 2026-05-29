import { FC } from "react";
import { Box, Container, Typography, Stack, alpha, Paper, Button } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { tokens, glassmorphism } from "../theme/tokens";
import { PublicLayout } from "../components/layout/PublicLayout";

const Section = ({ title, children, number }: { title: string, children: React.ReactNode, number: string }) => (
  <Box sx={{ mb: 6 }}>
    <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
      <Typography sx={{ 
        fontWeight: 800, 
        color: tokens.colors.primary, 
        fontSize: "0.875rem",
        opacity: 0.5,
        fontFamily: tokens.typography.fontFamily
      }}>
        {number}
      </Typography>
      <Typography sx={{ 
        fontWeight: 700, 
        fontSize: "1.25rem", 
        letterSpacing: "-0.02em",
        color: tokens.colors.onSurface
      }}>
        {title}
      </Typography>
    </Stack>
    <Box sx={{ 
      pl: 6, 
      borderLeft: `2px solid ${alpha(tokens.colors.primary, 0.1)}`,
      ml: 1.5
    }}>
      {children}
    </Box>
  </Box>
);

export const IntegrationsPage: FC = () => {
  return (
    <PublicLayout>
      <Box sx={{ 
        bgcolor: tokens.colors.surface, 
        minHeight: "100%", 
        py: 10,
        background: `radial-gradient(circle at 0% 100%, ${alpha(tokens.colors.primary, 0.05)} 0%, transparent 40%)` 
      }}>
        <Container maxWidth="md">
          <Box sx={{ mb: 6 }}>
            <Button component={RouterLink} to="/landing" startIcon={<ArrowBack sx={{ fontSize: 16 }} />} sx={{ textTransform: "none", fontWeight: 600, color: tokens.colors.onSurfaceVariant, fontSize: "0.875rem", "&:hover": { color: tokens.colors.primary, bgcolor: "transparent" } }}>Back to Home</Button>
          </Box>
          <Paper elevation={0} sx={{ p: { xs: 6, md: 10 }, borderRadius: "32px", ...glassmorphism }}>
            <Box sx={{ mb: 8 }}>
              <Typography sx={{ color: tokens.colors.primary, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontSize: "0.75rem", mb: 2 }}>Platform Capabilities</Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: "-0.04em", mb: 2, color: tokens.colors.onSurface }}>Ecosystem Integrations</Typography>
              <Typography sx={{ fontSize: "0.875rem", color: tokens.colors.onSurfaceVariant, fontWeight: 500, opacity: 0.7 }}>Updated May 2026 • v4.0</Typography>
            </Box>
            <Section number="01" title="HL7 & FHIR Standards">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                MedCore is engineered natively to support both legacy HL7 v2/v3 messaging and modern FHIR (Fast Healthcare Interoperability Resources) APIs. This guarantees seamless bi-directional data flow with external state registries, national health grids, and legacy hospital systems without heavy middleware.
              </Typography>
            </Section>
            <Section number="02" title="Diagnostic Modality Interfacing">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                Via DICOM and custom TCP/IP drivers, MedCore directly integrates with imaging modalities (MRI, CT, X-Ray) and automated laboratory analyzers (Beckman Coulter, Roche, Abbott). Results are populated directly into patient charts bypassing manual data entry entirely.
              </Typography>
            </Section>
            <Section number="03" title="Payment Gateway Sync">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                Our Billing Engine plugs directly into global payment providers (Stripe, Razorpay, regional banks) to facilitate instant co-pay settlements, automated invoicing, and digital receipts straight to the patient's portal or SMS.
              </Typography>
            </Section>

            <Box sx={{ 
              mt: 8, 
              p: 4, 
              borderRadius: "24px", 
              bgcolor: alpha(tokens.colors.primary, 0.03),
              border: `1px solid ${alpha(tokens.colors.primary, 0.1)}`,
              textAlign: "center"
            }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Interoperability is at our core.</Typography>
              <Typography sx={{ color: tokens.colors.onSurfaceVariant, mb: 3 }}>Connect your clinical ecosystem with MedCore APIs.</Typography>
              <Button 
                variant="contained" 
                component={RouterLink}
                to="/api-docs"
                sx={{ 
                  bgcolor: tokens.colors.primary, 
                  color: "white", 
                  borderRadius: "9999px",
                  px: 4,
                  textTransform: "none",
                  fontWeight: 700
                }}
              >
                View API Documentation
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </PublicLayout>
  );
};
