import { FC, ReactNode } from "react";
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

const Section = ({ title, children, number }: { title: string, children: ReactNode, number: string }) => (
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

export const PrivacyPage: FC = () => {
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
                Privacy Terms
              </Typography>
              <Typography sx={{ fontSize: "0.875rem", color: tokens.colors.onSurfaceVariant, fontWeight: 500, opacity: 0.7 }}>
                Updated May 2026 • v4.0
              </Typography>
            </Box>

            <Section number="01" title="Purpose and Scope of Data Collection">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                This comprehensive Privacy Policy outlines the explicit data processing protocols, retention schedules, and access controls for MedCore ("the Platform"). This policy applies to all clinical tenants, healthcare administrators, and authorized medical personnel utilizing the platform. We prioritize the uncompromising integrity and confidentiality of clinical data across our multi-tenant infrastructure, ensuring adherence to global healthcare data residency and interoperability standards.
              </Typography>
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 1.5 }}>
                By utilizing the MedCore suite, including but not limited to the Electronic Health Records (EHR) modules, Laboratory Information Systems (LIS), and Billing Engines, you consent to the secure processing of Protected Health Information (PHI) under the strictest boundaries defined in this document.
              </Typography>
            </Section>

            <Section number="02" title="Data Stewardship & Sovereign Ownership">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                Clinical tenants maintain absolute, exclusive ownership of all hosted data. MedCore acts strictly as a data custodian and processor. We explicitly declare that MedCore does not engage in data monetization, unauthorized secondary usage, or the sale of anonymized patient demographics to third-party entities.
              </Typography>
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 1.5 }}>
                In the event of contract termination or offboarding, tenants retain the right to complete data portability. MedCore guarantees the secure extraction of all patient records, audit logs, and billing histories in standardized formats (HL7, FHIR, or JSON) within 30 days of the request, followed by cryptographic erasure of the data from our active clusters.
              </Typography>
            </Section>

            <Section number="03" title="Cryptographic Security & Infrastructure">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                All clinical records, imaging files (PACS/DICOM), and financial transactions are encrypted at rest using industry-standard AES-256 protocols with dedicated Hardware Security Modules (HSM) managing the encryption keys. Data in transit is strictly protected via TLS 1.3 across all endpoints.
              </Typography>
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 1.5 }}>
                We employ robust physical and logical isolation techniques. Each tenant's data is partitioned at the database layer using Row-Level Security (RLS) to ensure zero cross-contamination. Automated vulnerability scanning and third-party penetration testing are conducted on a bi-weekly basis to preemptively neutralize zero-day threats.
              </Typography>
            </Section>

            <Section number="04" title="Compliance Frameworks & Auditability">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 2 }}>
                MedCore maintains continuous alignment with major healthcare regulatory frameworks, including HIPAA (Health Insurance Portability and Accountability Act), GDPR (General Data Protection Regulation), and SOC 2 Type II compliance standards.
              </Typography>
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 1.5 }}>
                To support internal tenant audits, the platform automatically maintains immutable access logs. Every discrete action—from viewing a patient's chart to generating a prescription—is permanently recorded with a timestamp, IP address, and user ID. These logs are accessible solely to the designated Tenant Administrator and cannot be altered by MedCore personnel.
              </Typography>
            </Section>

            <Section number="05" title="Subprocessors & Third-Party Integrations">
              <Typography sx={{ fontSize: "1rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.8, mb: 1.5 }}>
                To deliver our high-availability services, MedCore utilizes trusted subprocessors for cloud infrastructure and specialized analytics. All subprocessors are legally bound by Business Associate Agreements (BAAs) and are subjected to rigorous annual security audits. A full list of active subprocessors is available to Tenant Administrators within the platform settings. MedCore assumes full liability for the compliance of its subprocessors.
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
