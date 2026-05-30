import { type FormEvent, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Stack,
  alpha,
  InputAdornment,
  IconButton,
  Paper,
  Grid,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  LocalHospital,
  ArrowBack,
  Business,
  Badge,
  Phone,
  LocationOn,
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useRegisterMutation } from '../../store/api';
import { tokens, glassmorphism } from '../../theme/tokens';

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    hospitalName: '',
    email: '',
    password: '',
    address: '',
    phone: '',
    licenseNo: '',
    gstin: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  const isFormValid = useMemo(() => {
    return (
      formData.hospitalName.trim().length >= 2 &&
      isValidEmail(formData.email.trim()) &&
      formData.password.length >= 8 &&
      formData.licenseNo.trim().length >= 3
    );
  }, [formData]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);
    if (!isFormValid) return;

    setError(null);

    try {
      await register({
        hospitalName: formData.hospitalName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        licenseNo: formData.licenseNo.trim(),
        gstin: formData.gstin.trim() || undefined,
      }).unwrap();
      
      navigate('/login', { state: { message: 'Account created successfully! Please login.' } });
    } catch (err) {
      const parsedError = err as { data?: { message?: string } };
      setError(parsedError.data?.message || 'Registration failed. Please check your details and try again.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: tokens.colors.surface,
        background: `radial-gradient(circle at 0% 0%, ${alpha(tokens.colors.primary, 0.05)} 0%, transparent 40%), radial-gradient(circle at 100% 100%, ${alpha(tokens.colors.secondary, 0.05)} 0%, transparent 40%)`,
      }}
    >
      <Container maxWidth="md" sx={{ py: 6, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Box sx={{ mb: 4 }}>
          <Button
            component={RouterLink}
            to="/"
            startIcon={<ArrowBack />}
            sx={{
              textTransform: 'none',
              color: tokens.colors.onSurfaceVariant,
              fontWeight: 700,
              '&:hover': { bgcolor: alpha(tokens.colors.primary, 0.05), color: tokens.colors.primary },
            }}
          >
            Back to Home
          </Button>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, md: 8 },
            borderRadius: '40px',
            ...glassmorphism,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Box
              sx={{
                display: 'inline-flex',
                p: 2.5,
                borderRadius: '20px',
                bgcolor: alpha(tokens.colors.primary, 0.1),
                color: tokens.colors.primary,
                mb: 3,
                boxShadow: `0 8px 16px ${alpha(tokens.colors.primary, 0.15)}`
              }}
            >
              <LocalHospital sx={{ fontSize: 48 }} />
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: '-0.04em', mb: 1.5, color: tokens.colors.onSurface }}>
              Partner with MedCore
            </Typography>
            <Typography variant="body1" sx={{ color: tokens.colors.onSurfaceVariant, fontWeight: 500, opacity: 0.8 }}>
              Deploy your clinical instance and join the future of healthcare.
            </Typography>
          </Box>

          <form onSubmit={onSubmit} noValidate>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={3}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.primary, ml: 1, letterSpacing: '0.05em' }}>
                    HOSPITAL INFORMATION
                  </Typography>
                  <TextField
                    label="Hospital Name"
                    fullWidth
                    required
                    size="medium"
                    value={formData.hospitalName}
                    error={isSubmitted && formData.hospitalName.trim().length < 2}
                    onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Business fontSize="small" sx={{ color: tokens.colors.onSurfaceVariant }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
                  />
                  <TextField
                    label="Medical License Number"
                    fullWidth
                    required
                    size="medium"
                    value={formData.licenseNo}
                    error={isSubmitted && formData.licenseNo.trim().length < 3}
                    onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                    placeholder="e.g. LIC-123456"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Badge fontSize="small" sx={{ color: tokens.colors.onSurfaceVariant }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
                  />
                  <TextField
                    label="GSTIN (Optional)"
                    fullWidth
                    size="medium"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
                  />
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={3}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.primary, ml: 1, letterSpacing: '0.05em' }}>
                    CONTACT & ACCOUNT
                  </Typography>
                  <TextField
                    label="Admin Email"
                    type="email"
                    fullWidth
                    required
                    size="medium"
                    value={formData.email}
                    error={isSubmitted && !isValidEmail(formData.email.trim())}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email fontSize="small" sx={{ color: tokens.colors.onSurfaceVariant }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
                  />
                  <TextField
                    label="Secure Password"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    required
                    size="medium"
                    value={formData.password}
                    error={isSubmitted && formData.password.length < 8}
                    helperText={isSubmitted && formData.password.length < 8 ? 'Minimum 8 characters' : ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock fontSize="small" sx={{ color: tokens.colors.onSurfaceVariant }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: tokens.colors.onSurfaceVariant }}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
                  />
                  <TextField
                    label="Contact Phone (Optional)"
                    fullWidth
                    size="medium"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone fontSize="small" sx={{ color: tokens.colors.onSurfaceVariant }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
                  />
                </Stack>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Hospital Address (Optional)"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                        <LocationOn fontSize="small" sx={{ color: tokens.colors.onSurfaceVariant }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
                />
              </Grid>
            </Grid>

            {error && (
              <Alert severity="error" sx={{ mt: 4, borderRadius: '16px', fontWeight: 600 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isLoading}
              sx={{
                mt: 6,
                py: 2.25,
                borderRadius: '18px',
                bgcolor: tokens.colors.primary,
                fontWeight: 900,
                textTransform: 'none',
                fontSize: '1.125rem',
                boxShadow: `0 12px 32px ${alpha(tokens.colors.primary, 0.3)}`,
                '&:hover': {
                  bgcolor: tokens.colors.primaryContainer,
                  boxShadow: `0 16px 40px ${alpha(tokens.colors.primary, 0.4)}`,
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:disabled': { opacity: 0.7 }
              }}
            >
              {isLoading ? 'Creating Clinical Instance...' : 'Initialize My Hospital Instance'}
            </Button>

            <Typography variant="body1" align="center" sx={{ mt: 4, fontWeight: 600, color: tokens.colors.onSurfaceVariant }}>
              Already registered?{' '}
              <Typography
                component={RouterLink}
                to="/login"
                sx={{
                  color: tokens.colors.primary,
                  textDecoration: 'none',
                  fontWeight: 800,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Sign in here
              </Typography>
            </Typography>
          </form>
        </Paper>
        
        <Box sx={{ mt: 6, textAlign: 'center', opacity: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.02em', color: tokens.colors.onSurface }}>
            BY REGISTERING, YOU AGREE TO OUR TERMS OF SERVICE AND HIPAA COMPLIANCE PROTOCOLS.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
