import { FC } from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  alpha,
  Paper,
  Button,
} from "@mui/material";
import {
  ArrowBack,
} from "@mui/icons-material";
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

export const TermsPage: FC = () => {
  return (
    <PublicLayout>
      <Box sx={{ 
        bgcolor: tokens.colors.surface, 
        minHeight: "100%", 
        py: 10,
        background: `radial-gradient(circle at 0% 0%, ${alpha(tokens.colors.primary, 0.03)} 0%, transparent 40%)`
      }}>
        <Container maxWidth="md">
          <Box sx={{ mb: 6 }}>
            <Button
              component={RouterLink}
              to="/landing"
              startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
              sx={{ 
                textTransform: "none", 
                fontWeight: 600, 
                color: tokens.colors.onSurfaceVariant,
                fontSize: "0.875rem",
                "&:hover": { color: tokens.colors.primary, bgcolor: "transparent" }
              }}
            >
              Back to Home
            </Button>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 6, md: 10 },
              borderRadius: "32px",
              ...glassmorphism
            }}
          >
            <Box sx={{ mb: 8 }}>
              <Typography 
                sx={{ color: tokens.colors.primary, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontSize: "0.75rem", mb: 2 }}
              >
                Legal Documentation
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: "-0.04em", mb: 2, color: tokens.colors.onSurface }}>
                Terms of Service
              </Typography>
              <Typography sx={{ fontSize: "0.875rem", color: tokens.colors.onSurfaceVariant, fontWeight: 500, opacity: 0.7 }}>
                Updated May 2026 • v4.0
              </Typography>
            </Box>

            <Section number="01" title="Acceptance of Terms">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                By accessing or using the MedCore platform, you agree to be bound by these Terms of Service. This agreement governs your use of our clinical management systems, APIs, and associated infrastructure. If you are entering into these terms on behalf of a clinical entity, you represent that you have the authority to bind such entity.
              </Typography>
            </Section>

            <Section number="02" title="Service Level Agreement (SLA)">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                MedCore guarantees a 99.99% uptime for all core clinical services, including EHR access, patient intake APIs, and active charting modules. Maintenance windows are strictly scheduled outside of peak clinical hours (defined per your operational region) with a mandatory 48-hour advanced notice.
              </Typography>
            </Section>

            <Section number="03" title="Intellectual Property">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                The MedCore platform, including its proprietary algorithms, UI/UX designs, and backend architecture, remains the exclusive property of MedCore Systems. Tenants are granted a non-exclusive, non-transferable license to utilize the software for their internal clinical operations.
              </Typography>
            </Section>

            <Section number="04" title="Limitation of Liability">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                While MedCore provides robust clinical decision support tools and anomaly detection, the platform does not replace professional medical judgment. MedCore shall not be held liable for clinical outcomes, misdiagnoses, or direct damages resulting from the interpretation of data within the platform.
              </Typography>
            </Section>

            <Box 
              sx={{ 
                mt: 8, 
                pt: 4, 
                borderTop: `1px solid ${alpha(tokens.colors.onSurface, 0.05)}`, 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center" 
              }}
            >
              <Typography sx={{ fontSize: "0.75rem", color: tokens.colors.onSurfaceVariant, opacity: 0.6 }}>
                MedCore Legal Affairs
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: tokens.colors.primary, letterSpacing: "0.05em" }}>
                TRUST & SAFETY
              </Typography>
            </Box>
          </Paper>

          <Typography 
            variant="caption" 
            sx={{ display: "block", textAlign: "center", mt: 6, color: alpha(tokens.colors.onSurfaceVariant, 0.4) }}
          >
            Proprietary Information. Authorized Clinical Use Only.
          </Typography>
        </Container>
      </Box>
    </PublicLayout>
  );
};
