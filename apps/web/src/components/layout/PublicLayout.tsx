import { FC, ReactNode } from "react";
import { Box, Container, Typography, Button, Stack, Grid } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { LocalHospital } from "@mui/icons-material";
import { tokens } from "../../theme/tokens";

const Header = () => (
  <Box component="header" sx={{ 
    bgcolor: "white", 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    width: "100%", 
    px: 2, 
    height: 56, 
    position: "sticky", 
    top: 0, 
    zIndex: 50, 
    borderBottom: `1px solid ${tokens.colors.surfaceContainerHighest}`, 
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" 
  }}>
    <Stack direction="row" spacing={1} alignItems="center" component={RouterLink} to="/landing" sx={{ textDecoration: "none" }}>
      <LocalHospital sx={{ color: tokens.colors.primaryContainer }} />
      <Typography sx={{ 
        fontSize: "1.125rem", 
        fontWeight: 700, 
        color: tokens.colors.primaryContainer, 
        letterSpacing: "-0.025em", 
        fontFamily: tokens.typography.fontFamily 
      }}>
        Medical Center
      </Typography>
    </Stack>

    <Stack direction="row" spacing={3} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>
      <Typography component={RouterLink} to="/landing" sx={{ color: tokens.colors.primaryContainer, fontWeight: 600, fontSize: "0.875rem", letterSpacing: "-0.025em", textDecoration: "none" }}>Home</Typography>
      <Typography component={RouterLink} to="/departments" sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500, fontSize: "0.875rem", letterSpacing: "-0.025em", textDecoration: "none", "&:hover": { color: tokens.colors.onSurface } }}>Departments</Typography>
      <Typography component={RouterLink} to="/modules" sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500, fontSize: "0.875rem", letterSpacing: "-0.025em", textDecoration: "none", "&:hover": { color: tokens.colors.onSurface } }}>Features</Typography>
      <Typography component={RouterLink} to="/help" sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500, fontSize: "0.875rem", letterSpacing: "-0.025em", textDecoration: "none", "&:hover": { color: tokens.colors.onSurface } }}>Help Center</Typography>
      <Typography component={RouterLink} to="/contact" sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500, fontSize: "0.875rem", letterSpacing: "-0.025em", textDecoration: "none", "&:hover": { color: tokens.colors.onSurface } }}>Contact</Typography>
    </Stack>

    <Stack direction="row" spacing={1.5} alignItems="center">
      <Button component={RouterLink} to="/login" variant="contained" sx={{ 
        bgcolor: tokens.colors.primary, 
        color: "white", 
        borderRadius: "9999px", 
        px: 4, 
        py: 1, 
        ...tokens.typography.labelMd, 
        textTransform: "none", 
        boxShadow: "none", 
        "&:hover": { bgcolor: tokens.colors.primary, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" } 
      }}>
        Sign In
      </Button>
    </Stack>
  </Box>
);

const Footer = () => (
  <Box component="footer" sx={{ bgcolor: tokens.colors.surfaceContainerHighest, py: 4, borderTop: `1px solid ${tokens.colors.outlineVariant}` }}>
    <Container maxWidth="xl">
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <LocalHospital sx={{ color: tokens.colors.primaryContainer }} />
            <Typography sx={{ fontSize: "1.125rem", fontWeight: 700, color: tokens.colors.primaryContainer, letterSpacing: "-0.025em" }}>Medical Center</Typography>
          </Stack>
          <Typography sx={{ ...tokens.typography.bodySm, color: tokens.colors.onSurfaceVariant, maxWidth: "24rem" }}>
            The world's most trusted hospital management system. Built for speed, security, and superior patient care outcomes.
          </Typography>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Typography component="h5" sx={{ ...tokens.typography.labelMd, color: tokens.colors.onSurface, mb: 1.5 }}>Platform</Typography>
          <Stack spacing={1}>
            {[
              { label: "Multi-tenancy", to: "/scalability" },
              { label: "Role-Based Access", to: "/security" },
              { label: "Tech Stack", to: "/scalability" },
              { label: "Security", to: "/security" }
            ].map(item => (
              <Typography key={item.label} component={RouterLink} to={item.to} sx={{ ...tokens.typography.bodySm, color: tokens.colors.onSurfaceVariant, textDecoration: "none", "&:hover": { color: tokens.colors.primary } }}>{item.label}</Typography>
            ))}
          </Stack>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Typography component="h5" sx={{ ...tokens.typography.labelMd, color: tokens.colors.onSurface, mb: 1.5 }}>Resources</Typography>
          <Stack spacing={1}>
            {[
              { label: "Staff Directory", to: "/dashboard" },
              { label: "API Documentation", to: "/integrations" },
              { label: "Pharmacy Inventory", to: "/pharmacy" },
              { label: "Laboratory Results", to: "/lab" }
            ].map(item => (
              <Typography key={item.label} component={RouterLink} to={item.to} sx={{ ...tokens.typography.bodySm, color: tokens.colors.onSurfaceVariant, textDecoration: "none", "&:hover": { color: tokens.colors.primary } }}>{item.label}</Typography>
            ))}
          </Stack>
        </Grid>
      </Grid>
      <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${tokens.colors.outlineVariant}`, display: "flex", flexDirection: { xs: "column", md: "row" }, justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Typography sx={{ ...tokens.typography.bodySm, color: tokens.colors.onSurfaceVariant, opacity: 0.7 }}>
          © {new Date().getFullYear()} HMS Medical Center. All rights reserved.
        </Typography>
        <Stack direction="row" spacing={3}>
          <Typography component={RouterLink} to="/privacy" sx={{ ...tokens.typography.bodySm, color: tokens.colors.onSurfaceVariant, textDecoration: "none", opacity: 0.7, "&:hover": { color: tokens.colors.primary, opacity: 1 } }}>
            Privacy Policy
          </Typography>
          <Typography component={RouterLink} to="/terms" sx={{ ...tokens.typography.bodySm, color: tokens.colors.onSurfaceVariant, textDecoration: "none", opacity: 0.7, "&:hover": { color: tokens.colors.primary, opacity: 1 } }}>
            Terms of Service
          </Typography>
        </Stack>
      </Box>
    </Container>
  </Box>
);

interface PublicLayoutProps {
  children: ReactNode;
}

export const PublicLayout: FC<PublicLayoutProps> = ({ children }) => {
  return (
    <Box sx={{ bgcolor: tokens.colors.surface, color: tokens.colors.onSurface, fontFamily: tokens.typography.fontFamily, minHeight: "100vh", display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
};
