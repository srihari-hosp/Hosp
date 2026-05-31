import { FC } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Stack,
  Paper,
  alpha,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import {
  LayersOutlined,
  AdminPanelSettingsOutlined,
  TerminalOutlined,
  MedicationOutlined,
  BiotechOutlined,
  HealthAndSafetyOutlined,
  SettingsAccessibilityOutlined,
  ChevronRight,
  ShieldOutlined
} from "@mui/icons-material";
import { tokens } from "../theme/tokens";
import { PublicLayout } from "../components/layout/PublicLayout";

export const LandingPage: FC = () => {
  return (
    <PublicLayout>
      <Box component="section" sx={{ position: "relative", minHeight: "707px", display: "flex", alignItems: "center", overflow: "hidden", bgcolor: tokens.colors.surfaceContainerLowest }}>
        <Box sx={{ position: "absolute", inset: 0, zIndex: 0, opacity: 0.1 }}>
          <Box sx={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", bgcolor: tokens.colors.primaryContainer, borderBottomLeftRadius: tokens.shape.borderRadius.massive }} />
        </Box>
        <Container maxWidth="xl" sx={{ position: "relative", zIndex: 10, py: 10 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, lg: 6 }}>
              <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
                <Box sx={{ display: "inline-block", px: 2, py: 0.5, borderRadius: "9999px", bgcolor: tokens.colors.tertiaryFixed, color: tokens.colors.onTertiaryFixed, width: "fit-content", ...tokens.typography.labelSm }}>
                  HMS VERSION 4.0 NOW LIVE
                </Box>
                <Typography component="h1" sx={{ ...tokens.typography.h1, color: tokens.colors.onSurface, maxWidth: "36rem" }}>
                  Digitize Your Medical Facility with Enterprise Precision
                </Typography>
                <Typography sx={{ ...tokens.typography.bodyMd, color: tokens.colors.onSurfaceVariant, maxWidth: "32rem" }}>
                  A unified ecosystem for modern healthcare. Experience the power of Multi-tenancy and Role-Based Access Control on a world-class tech stack.
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ mt: 2, flexWrap: "wrap" }}>
                  <Button variant="contained" component={RouterLink} to="/register" sx={{ bgcolor: tokens.colors.primary, color: "#fff", px: 4, py: 1.5, borderRadius: tokens.shape.borderRadius.full, ...tokens.typography.labelMd, textTransform: "none", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", "&:hover": { bgcolor: tokens.colors.primary, transform: "scale(0.95)" }, transition: "all 0.2s" }}>
                    Get Started Free
                  </Button>
                  <Button variant="outlined" component={RouterLink} to="/modules" sx={{ outline: `1px solid ${tokens.colors.outlineVariant}`, color: tokens.colors.primary, px: 4, py: 1.5, borderRadius: tokens.shape.borderRadius.full, ...tokens.typography.labelMd, textTransform: "none", "&:hover": { bgcolor: alpha(tokens.colors.primary, 0.05), outline: `1px solid ${tokens.colors.outlineVariant}` }, transition: "all 0.2s" }}>
                    Explore Features
                  </Button>
                </Stack>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Box sx={{ position: "relative", "&:hover img": { filter: "grayscale(0)" } }}>
                <Box sx={{ aspectRatio: "16/9", borderRadius: tokens.shape.borderRadius.full, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", border: "4px solid white" }}>
                  <Box component="img" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAyaHWkDeYrilI6xjmIUS01277uD9IOc7uqzRb17CXNG3_7qN6fvkvxQsoDViKxQ5VuqZ5uDQ1UWAcbTXkuHaZDUouhcH5whZgxhtbq8uXTLhnQ3ahlALXKzJPFI56SlJUhHhwRvvwmzYhKjV3NNh1wvWviZLuSaaIX6E3J4E1plRw3okP3ulY0QCVNOOpZ1ULvEiFThLt-6gEU9bkDzS7q_r7dXX8OoUGL1daSuKPOsDL-RQGmPa8pUmrr7xPWwS_vHOoD_KHcWqI9" sx={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(0.2)", transition: "all 0.7s" }} />
                </Box>
                <Paper sx={{ position: "absolute", bottom: -32, left: -32, bgcolor: "#fff", p: 3, borderRadius: tokens.shape.borderRadius.xl, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", border: `1px solid ${tokens.colors.outlineVariant}`, maxWidth: 200 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <ShieldOutlined sx={{ color: tokens.colors.tertiary, fontSize: "1.125rem" }} />
                    <Typography sx={{ ...tokens.typography.labelSm, color: tokens.colors.onSurface }}>HIPAA Compliant</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: "10px", color: tokens.colors.onSurfaceVariant, lineHeight: 1.2 }}>
                    Military grade encryption for all patient record databases.
                  </Typography>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Engineered for Scale */}
      <Box component="section" sx={{ py: 8, bgcolor: tokens.colors.surfaceContainerLow }}>
        <Container maxWidth="xl">
          <Box sx={{ mb: 6, textAlign: "center" }}>
            <Typography component="h2" sx={{ ...tokens.typography.h2, color: tokens.colors.onSurface }}>Engineered for Scale</Typography>
            <Typography sx={{ ...tokens.typography.bodySm, color: tokens.colors.onSurfaceVariant }}>Built on the industry-leading tech stack for performance and security.</Typography>
          </Box>
          
          <Box sx={{ 
            display: "grid", 
            gap: 3, 
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }
          }}>
            <Paper sx={{ gridColumn: { md: "span 2" }, bgcolor: "#fff", p: { xs: 3, md: 5 }, borderRadius: tokens.shape.borderRadius.full, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", border: `1px solid ${tokens.colors.outlineVariant}`, display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
              <Box>
                <LayersOutlined sx={{ color: tokens.colors.primary, mb: 2, fontSize: { xs: "2rem", md: "2.5rem" } }} />
                <Typography component="h3" sx={{ ...tokens.typography.h3, color: tokens.colors.onSurface }}>Native Multi-tenancy</Typography>
                <Typography sx={{ ...tokens.typography.bodyMd, color: tokens.colors.onSurfaceVariant, mt: 2, maxWidth: "32rem" }}>
                  Manage multiple clinic locations, laboratories, and imaging centers from a single unified dashboard without data bleeding.
                </Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2, mt: 4 }}>
                <Box sx={{ bgcolor: tokens.colors.surfaceContainer, p: 2, borderRadius: tokens.shape.borderRadius.xl, border: `1px solid ${alpha(tokens.colors.outlineVariant, 0.5)}` }}>
                  <Typography sx={{ ...tokens.typography.labelSm, display: "block", mb: 1 }}>DATA ISOLATION</Typography>
                  <Box sx={{ height: 8, width: "100%", bgcolor: alpha(tokens.colors.primaryContainer, 0.2), borderRadius: "9999px" }}>
                    <Box sx={{ height: "100%", width: "100%", bgcolor: tokens.colors.primaryContainer, borderRadius: "9999px" }} />
                  </Box>
                </Box>
                <Box sx={{ bgcolor: tokens.colors.surfaceContainer, p: 2, borderRadius: tokens.shape.borderRadius.xl, border: `1px solid ${alpha(tokens.colors.outlineVariant, 0.5)}` }}>
                  <Typography sx={{ ...tokens.typography.labelSm, display: "block", mb: 1 }}>NETWORK UPTIME</Typography>
                  <Box sx={{ height: 8, width: "100%", bgcolor: alpha(tokens.colors.tertiaryContainer, 0.2), borderRadius: "9999px" }}>
                    <Box sx={{ height: "100%", width: "99%", bgcolor: tokens.colors.tertiaryContainer, borderRadius: "9999px" }} />
                  </Box>
                </Box>
              </Box>
            </Paper>
            <Paper sx={{ gridColumn: { md: "span 1" }, bgcolor: tokens.colors.primary, color: "#fff", p: { xs: 3, md: 5 }, borderRadius: tokens.shape.borderRadius.full, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
              <AdminPanelSettingsOutlined sx={{ fontSize: { xs: "3.5rem", md: "4rem" }, mb: 2 }} />
              <Typography component="h3" sx={{ ...tokens.typography.h3 }}>RBAC Mastery</Typography>
              <Typography sx={{ ...tokens.typography.bodySm, opacity: 0.9, mt: 2 }}>
                Granular Role-Based Access Control ensures doctors, nurses, and admins only see what they need.
              </Typography>
              <Button component={RouterLink} to="/security" sx={{ mt: 4, color: "#fff", borderBottom: "2px solid rgba(255,255,255,0.5)", borderRadius: 0, p: 0, minWidth: 0, "&:hover": { bgcolor: "transparent", borderBottomColor: "#fff" }, ...tokens.typography.labelMd, textTransform: "none" }}>
                Setup Roles
              </Button>
            </Paper>
            <Paper sx={{ gridColumn: { md: "span 1" }, bgcolor: "#fff", p: { xs: 3, md: 5 }, borderRadius: tokens.shape.borderRadius.full, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", border: `1px solid ${tokens.colors.outlineVariant}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <TerminalOutlined sx={{ color: tokens.colors.secondary, mb: 2, fontSize: "2.5rem" }} />
              <Typography component="h3" sx={{ ...tokens.typography.h3 }}>Modern Tech Stack</Typography>
              <Typography sx={{ ...tokens.typography.bodySm, color: tokens.colors.onSurfaceVariant, mt: 2 }}>
                Built with React, Node.js, and PostgreSQL for lighting fast response times and deep audit trails.
              </Typography>
            </Paper>
            <Paper sx={{ gridColumn: { md: "span 2" }, bgcolor: "#fff", p: { xs: 3, md: 5 }, borderRadius: tokens.shape.borderRadius.full, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", border: `1px solid ${tokens.colors.outlineVariant}`, display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
              <Box sx={{ width: "33.333%", flexShrink: 0, display: { xs: "none", sm: "block" } }}>
                <Box component="img" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7VL_Ru9QJiWyGVVom03kGcR5mrMWZ_HlBN0u5b6waJDYBFVH9Tv3KP9-73xne59RTr6KWVH7VFw4uhshmznfTy2331XrvtXdkMXYxvE_TNuFaFBnXr61pPZCwtwSt-zrXohYkJ-xIDa92KhfomThD390RHBBGuwxRLwKz-0-ZODq2QaSqQ2sbikn54Wra9e8CBGgwX077ZGipoeg6ennHxxqwpFFEMvPMZsG1JivEXGojwKnp4TclN7q4RIYEQ2tBoaFpU1MRVFjh" sx={{ borderRadius: tokens.shape.borderRadius.xl, objectFit: "cover", aspectRatio: "1/1", width: "100%" }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography component="h3" sx={{ ...tokens.typography.h3 }}>Patient-Centric Portal</Typography>
                <Typography sx={{ ...tokens.typography.bodySm, color: tokens.colors.onSurfaceVariant, mt: 2 }}>
                  Self-service appointments, digital prescriptions, and instant lab results access for patients.
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Container>
      </Box>

      {/* Department Cards Section */}
      <Box component="section" sx={{ py: 8, bgcolor: tokens.colors.surface }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 6, flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ maxWidth: "36rem" }}>
              <Typography component="h2" sx={{ ...tokens.typography.h2, color: tokens.colors.onSurface }}>Integrated Specialized Departments</Typography>
              <Typography sx={{ ...tokens.typography.bodySm, color: tokens.colors.onSurfaceVariant }}>Custom-tailored modules for every hospital wing, sharing one central source of truth.</Typography>
            </Box>
            <Button component={RouterLink} to="/departments" sx={{ color: tokens.colors.primary, ...tokens.typography.labelMd, textTransform: "none", "&:hover": { textDecoration: "underline", bgcolor: "transparent" }, p: 0 }}>
              View All Departments <ChevronRight fontSize="small" />
            </Button>
          </Box>

          <Grid container spacing={4}>
            {[
              { title: "Pharmacy", icon: <MedicationOutlined />, desc: "Real-time inventory, batch tracking, and e-prescription fulfillment.", tag: "STOCK READY" },
              { title: "Laboratory", icon: <BiotechOutlined />, desc: "LIS integration, automated reporting, and specimen lifecycle tracking.", tag: "HL7 COMPLIANT" },
              { title: "ER & Triage", icon: <HealthAndSafetyOutlined />, desc: "Rapid intake, priority queuing, and real-time bed management.", tag: "24/7 AUTO-SYNC" },
              { title: "Radiology", icon: <SettingsAccessibilityOutlined />, desc: "DICOM imaging support, PACS integration, and remote specialist access.", tag: "IMAGE SECURE" },
            ].map((dept) => (
              <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={dept.title}>
                <Paper sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column", borderRadius: tokens.shape.borderRadius.full, bgcolor: "#fff", border: `1px solid ${tokens.colors.outlineVariant}`, transition: "all 0.2s", cursor: "pointer", "&:hover": { borderColor: tokens.colors.primary, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }, "&:hover .icon-box": { bgcolor: tokens.colors.primary, color: "#fff" } }}>
                  <Box className="icon-box" sx={{ width: 48, height: 48, borderRadius: tokens.shape.borderRadius.xl, bgcolor: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", mb: 3, transition: "colors 0.2s", color: tokens.colors.primary }}>
                    {dept.icon}
                  </Box>
                  <Typography component="h4" sx={{ ...tokens.typography.h3, fontSize: "1.125rem", color: tokens.colors.onSurface }}>{dept.title}</Typography>
                  <Typography sx={{ ...tokens.typography.bodySm, color: tokens.colors.onSurfaceVariant, mt: 1.5, flexGrow: 1 }}>{dept.desc}</Typography>
                  <Box sx={{ mt: 3, display: "flex" }}>
                    <Typography sx={{ px: 1.5, py: 0.5, borderRadius: "4px", bgcolor: tokens.colors.surfaceContainer, color: tokens.colors.onSurface, fontSize: "10px", fontWeight: 700 }}>
                      {dept.tag}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box component="section" sx={{ py: 10, bgcolor: tokens.colors.primaryContainer, position: "relative", overflow: "hidden" }}>
        <Box sx={{ position: "absolute", inset: 0, bgcolor: "#1e3a8a", opacity: 0.2 }} />
        <Container maxWidth="xl" sx={{ position: "relative", zIndex: 10, textAlign: "center" }}>
          <Typography component="h2" sx={{ ...tokens.typography.h1, color: tokens.colors.onPrimaryContainer, mb: 3 }}>Ready to modernize your healthcare delivery?</Typography>
          <Typography sx={{ ...tokens.typography.bodyMd, color: tokens.colors.onPrimaryContainer, opacity: 0.9, mb: 6, maxWidth: "42rem", mx: "auto" }}>
            Join over 500+ medical centers worldwide that have transformed their patient experience and operational efficiency with our HMS.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
            <Button component={RouterLink} to="/register" variant="contained" sx={{ bgcolor: "#fff", color: tokens.colors.primary, px: 6, py: 2, borderRadius: tokens.shape.borderRadius.xl, ...tokens.typography.labelMd, textTransform: "none", "&:hover": { bgcolor: tokens.colors.surfaceContainerHighest } }}>
              Get Started Now
            </Button>
            <Button component={RouterLink} to="/login" variant="outlined" sx={{ outline: "2px solid rgba(255,255,255,0.3)", color: "#fff", px: 6, py: 2, borderRadius: tokens.shape.borderRadius.xl, ...tokens.typography.labelMd, textTransform: "none", "&:hover": { bgcolor: "rgba(255,255,255,0.1)", outline: "2px solid rgba(255,255,255,0.3)" } }}>
              Sign In to Portal
            </Button>
          </Stack>
        </Container>
      </Box>
    </PublicLayout>
  );
};
