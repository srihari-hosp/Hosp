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

export const CommunityPage: FC = () => {
  return (
    <PublicLayout>
      <Box sx={{ 
        bgcolor: tokens.colors.surface, 
        minHeight: "100%", 
        py: 10,
        background: `radial-gradient(circle at 100% 0%, ${alpha(tokens.colors.primary, 0.03)} 0%, transparent 40%)` 
      }}>
        <Container maxWidth="md">
          <Box sx={{ mb: 6 }}>
            <Button component={RouterLink} to="/landing" startIcon={<ArrowBack sx={{ fontSize: 16 }} />} sx={{ textTransform: "none", fontWeight: 600, color: tokens.colors.onSurfaceVariant, fontSize: "0.875rem", "&:hover": { color: tokens.colors.primary, bgcolor: "transparent" } }}>Back to Home</Button>
          </Box>
          <Paper elevation={0} sx={{ p: { xs: 6, md: 10 }, borderRadius: "32px", ...glassmorphism }}>
            <Box sx={{ mb: 8 }}>
              <Typography sx={{ color: tokens.colors.primary, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontSize: "0.75rem", mb: 2 }}>Support & Resources</Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: "-0.04em", mb: 2, color: tokens.colors.onSurface }}>Developer Community</Typography>
              <Typography sx={{ fontSize: "0.875rem", color: tokens.colors.onSurfaceVariant, fontWeight: 500, opacity: 0.7 }}>Updated May 2026 • v2.0</Typography>
            </Box>
            <Section number="01" title="Open Source Contributions">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                MedCore proudly open-sources our UI components and several non-critical interoperability libraries. Developers worldwide are encouraged to contribute to our FHIR transformation scripts and community-driven report templates via our official GitHub organization.
              </Typography>
            </Section>
            <Section number="02" title="Clinical Advisory Board">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                Our platform's roadmap is dictated by our Clinical Advisory Board—a community of 500+ active doctors, nurses, and hospital administrators. Regular virtual summits ensure that our engineering efforts directly solve the most painful friction points in modern medicine.
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
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Built by clinicians, for clinicians.</Typography>
              <Typography sx={{ color: tokens.colors.onSurfaceVariant, mb: 3 }}>Join our Slack community to discuss features and integrations.</Typography>
              <Button 
                variant="contained" 
                sx={{ 
                  bgcolor: tokens.colors.primary, 
                  color: "white", 
                  borderRadius: "9999px",
                  px: 4,
                  textTransform: "none",
                  fontWeight: 700
                }}
              >
                Join Community Slack
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </PublicLayout>
  );
};
