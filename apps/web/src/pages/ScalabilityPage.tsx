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

export const ScalabilityPage: FC = () => {
  return (
    <PublicLayout>
      <Box sx={{ 
        bgcolor: tokens.colors.surface, 
        minHeight: "100%", 
        py: 10,
        background: `radial-gradient(circle at 100% 100%, ${alpha(tokens.colors.primary, 0.03)} 0%, transparent 40%)` 
      }}>
        <Container maxWidth="md">
          <Box sx={{ mb: 6 }}>
            <Button component={RouterLink} to="/landing" startIcon={<ArrowBack sx={{ fontSize: 16 }} />} sx={{ textTransform: "none", fontWeight: 600, color: tokens.colors.onSurfaceVariant, fontSize: "0.875rem", "&:hover": { color: tokens.colors.primary, bgcolor: "transparent" } }}>Back to Home</Button>
          </Box>
          <Paper elevation={0} sx={{ p: { xs: 6, md: 10 }, borderRadius: "32px", ...glassmorphism }}>
            <Box sx={{ mb: 8 }}>
              <Typography sx={{ color: tokens.colors.primary, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontSize: "0.75rem", mb: 2 }}>Platform Capabilities</Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: "-0.04em", mb: 2, color: tokens.colors.onSurface }}>Infinite Scalability</Typography>
              <Typography sx={{ fontSize: "0.875rem", color: tokens.colors.onSurfaceVariant, fontWeight: 500, opacity: 0.7 }}>Updated May 2026 • v5.3</Typography>
            </Box>
            <Section number="01" title="Distributed Database Sharding">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                MedCore utilizes horizontal database sharding based on geographic clinical regions. This ensures that a massive influx of patient records in one hospital branch does not degrade the query performance of another branch.
              </Typography>
            </Section>
            <Section number="02" title="Kubernetes Auto-Scaling">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                Our microservices are orchestrated via Kubernetes. During peak hours (e.g., morning clinical rounds), the infrastructure automatically provisions additional pods within seconds to handle increased charting API traffic, ensuring latency remains under 50ms.
              </Typography>
            </Section>
            <Section number="03" title="Multi-Region Failover">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                To guarantee 99.99% uptime, MedCore operates active-active data centers across multiple geographical regions. In the event of a catastrophic regional failure, clinical traffic is instantly routed to a secondary region with zero data loss.
              </Typography>
            </Section>

            <Box sx={{ 
              mt: 8, 
              p: 5, 
              borderRadius: "24px", 
              bgcolor: alpha(tokens.colors.primary, 0.05),
              border: `1px solid ${alpha(tokens.colors.primary, 0.1)}`,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              gap: 4
            }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 900, fontSize: '1.25rem', mb: 1, letterSpacing: '-0.02em' }}>Enterprise Scale Ready.</Typography>
                <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>Deploy MedCore across national health grids with confidence.</Typography>
              </Box>
              <Button 
                variant="contained" 
                component={RouterLink}
                to="/enterprise"
                sx={{ 
                  bgcolor: tokens.colors.primary, 
                  color: "#fff", 
                  borderRadius: "14px",
                  px: 4,
                  py: 1.5,
                  textTransform: "none",
                  fontWeight: 700,
                  boxShadow: `0 8px 16px ${alpha(tokens.colors.primary, 0.2)}`
                }}
              >
                Learn about Enterprise
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </PublicLayout>
  );
};
