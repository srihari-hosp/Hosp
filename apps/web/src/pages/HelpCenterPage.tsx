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

export const HelpCenterPage: FC = () => {
  return (
    <PublicLayout>
      <Box sx={{ 
        bgcolor: tokens.colors.surface, 
        minHeight: "100%", 
        py: 10,
        background: `radial-gradient(circle at 0% 0%, ${alpha(tokens.colors.primary, 0.05)} 0%, transparent 40%)` 
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

          <Paper elevation={0} sx={{ 
            p: { xs: 6, md: 10 }, 
            borderRadius: "32px", 
            ...glassmorphism 
          }}>
            <Box sx={{ mb: 8 }}>
              <Typography sx={{ 
                color: tokens.colors.primary, 
                fontWeight: 800, 
                letterSpacing: "0.15em", 
                textTransform: "uppercase",
                fontSize: "0.75rem",
                mb: 2
              }}>
                Support & Resources
              </Typography>
              <Typography variant="h3" sx={{ 
                fontWeight: 900, 
                letterSpacing: "-0.04em", 
                mb: 2,
                color: tokens.colors.onSurface
              }}>
                Help Center
              </Typography>
              <Typography sx={{ 
                fontSize: "0.875rem", 
                color: tokens.colors.onSurfaceVariant, 
                fontWeight: 500,
                opacity: 0.7
              }}>
                Last Updated: May 2026
              </Typography>
            </Box>

            <Section number="01" title="Knowledge Base">
              <Typography sx={{ 
                fontSize: "1rem", 
                color: tokens.colors.onSurfaceVariant, 
                lineHeight: 1.8, 
                mb: 2 
              }}>
                Access our extensive library of training videos, charting shortcuts, and API documentation directly from your Dashboard. The Knowledge Base is continually updated by our clinical advisory team to match the latest medical coding standards.
              </Typography>
            </Section>

            <Section number="02" title="Support Ticketing SLA">
              <Typography sx={{ 
                fontSize: "1rem", 
                color: tokens.colors.onSurfaceVariant, 
                lineHeight: 1.8, 
                mb: 2 
              }}>
                All tickets submitted via the internal MedCore portal are subject to strict SLAs. Severity 1 (Critical Outage) tickets guarantee a response from a Tier 3 engineer within 15 minutes. Severity 3 (General Inquiry) tickets are resolved within 24 hours.
              </Typography>
            </Section>

            <Section number="03" title="Live Training Sessions">
              <Typography sx={{ 
                fontSize: "1rem", 
                color: tokens.colors.onSurfaceVariant, 
                lineHeight: 1.8, 
                mb: 2 
              }}>
                New clinical hires? MedCore provides weekly live webinar onboarding sessions covering EHR navigation, e-prescribing, and consent management. Administrators can schedule these sessions via the Help Portal.
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
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Still need help?</Typography>
              <Typography sx={{ color: tokens.colors.onSurfaceVariant, mb: 3 }}>Our support team is available 24/7 for critical issues.</Typography>
              <Button 
                variant="contained" 
                component={RouterLink}
                to="/contact"
                sx={{ 
                  bgcolor: tokens.colors.primary, 
                  color: "white", 
                  borderRadius: "9999px",
                  px: 4,
                  textTransform: "none",
                  fontWeight: 700
                }}
              >
                Contact Support
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </PublicLayout>
  );
};
