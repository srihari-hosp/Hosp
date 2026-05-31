import { FC } from "react";
import { Box, Container, Typography, Stack, alpha, Paper, Button, Grid, TextField, InputAdornment } from "@mui/material";
import { ArrowBack, Email, Person, Message } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { tokens, glassmorphism } from "../theme/tokens";
import { PublicLayout } from "../components/layout/PublicLayout";

export const ContactPage: FC = () => {
  return (
    <PublicLayout>
      <Box sx={{ 
        bgcolor: tokens.colors.surface, 
        minHeight: "100%", 
        py: 10,
        background: `radial-gradient(circle at 0% 0%, ${alpha(tokens.colors.primary, 0.05)} 0%, transparent 40%)` 
      }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 6 }}>
            <Button component={RouterLink} to="/landing" startIcon={<ArrowBack sx={{ fontSize: 16 }} />} sx={{ textTransform: "none", fontWeight: 600, color: tokens.colors.onSurfaceVariant, fontSize: "0.875rem", "&:hover": { color: tokens.colors.primary, bgcolor: "transparent" } }}>Back to Home</Button>
          </Box>

          <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography sx={{ color: tokens.colors.primary, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", fontSize: "0.75rem", mb: 2 }}>Get in Touch</Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: "-0.04em", mb: 3, color: tokens.colors.onSurface }}>Connect with our Clinical Experts</Typography>
              <Typography sx={{ fontSize: "1.125rem", color: tokens.colors.onSurfaceVariant, lineHeight: 1.7, mb: 6, fontWeight: 500 }}>
                Whether you're looking to scale your hospital operations or have specific integration questions, our team is here to help you navigate the future of digital health.
              </Typography>

              <Stack spacing={4}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", mb: 1 }}>General Inquiries</Typography>
                  <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>support@medcore.clinical</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", mb: 1 }}>Enterprise Sales</Typography>
                  <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>partnerships@medcore.clinical</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", mb: 1 }}>Global HQ</Typography>
                  <Typography sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500 }}>12/B Health Sciences District, Tech City 560001</Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Paper elevation={0} sx={{ p: { xs: 4, md: 8 }, borderRadius: "32px", ...glassmorphism, border: `1px solid ${tokens.colors.outlineVariant}` }}>
                <Stack
                  component="form"
                  spacing={4}
                  onSubmit={(event) => {
                    event.preventDefault();
                    // TODO: invoke contact API / mutation
                  }}
                >
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        placeholder="John Doe"
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><Person fontSize="small" /></InputAdornment>,
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Email Address"
                        placeholder="john@hospital.com"
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment>,
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px' } }}
                      />
                    </Grid>
                  </Grid>
                  <TextField
                    fullWidth
                    label="Organization / Hospital"
                    placeholder="City General Hospital"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px' } }}
                  />
                  <TextField
                    fullWidth
                    label="Message"
                    multiline
                    rows={4}
                    placeholder="How can we help you?"
                    InputProps={{
                      startAdornment: <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}><Message fontSize="small" /></InputAdornment>,
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px' } }}
                  />
                  <Button 
                    type="submit"
                    variant="contained" 
                    fullWidth 
                    sx={{ 
                      bgcolor: tokens.colors.primary, 
                      py: 2, 
                      borderRadius: '16px', 
                      fontWeight: 800, 
                      fontSize: '1rem',
                      textTransform: 'none',
                      boxShadow: `0 8px 24px ${alpha(tokens.colors.primary, 0.25)}`,
                      '&:hover': { bgcolor: tokens.colors.primaryContainer }
                    }}
                  >
                    Send Clinical Inquiry
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </PublicLayout>
  );
};
