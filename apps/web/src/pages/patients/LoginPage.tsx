import { type FormEvent, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  TextField,
  Typography,
  Stack,
  alpha,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  LocalHospital,
  ArrowBack,
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useLoginMutation } from '../../store/api';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  clearAuthError,
  loginFailure,
  loginStart,
  loginSuccess,
} from '../../store/slices/authSlice';

const themeTokens = {
  colors: {
    primary: '#005dac',
    text: {
      primary: '#1b1b1f',
      secondary: '#44474e',
    },
  },
};

type FetchLikeError = {
  status?: unknown;
  data?: unknown;
};

const isFetchLikeError = (value: unknown): value is FetchLikeError => {
  return !!value && typeof value === 'object' && 'status' in value;
};

const readApiErrorMessage = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const parsed = value as { message?: unknown; error?: { message?: unknown } };
  if (typeof parsed.message === 'string' && parsed.message.trim()) {
    return parsed.message;
  }
  if (typeof parsed.error?.message === 'string' && parsed.error.message.trim()) {
    return parsed.error.message;
  }
  return null;
};

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const authError = useAppSelector((state) => state.auth.error);
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const emailValue = email.trim();
  const passwordValue = password;
  const emailHasError = isSubmitted && !isValidEmail(emailValue);
  const passwordHasError = isSubmitted && passwordValue.length < 8;
  const mfaValue = useBackupCode ? backupCode.trim() : mfaCode.trim();

  const isFormValid = useMemo(() => {
    if (!isValidEmail(emailValue) || passwordValue.length < 8) {
      return false;
    }
    if (mfaRequired && mfaValue.length < 6) {
      return false;
    }
    return true;
  }, [emailValue, passwordValue, mfaRequired, mfaValue]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);
    if (!isFormValid) {
      return;
    }

    dispatch(loginStart());

    try {
      const result = await login({
        email: emailValue,
        password: passwordValue,
        rememberMe,
        ...(mfaRequired
          ? {
              mfaToken: mfaToken ?? undefined,
              ...(useBackupCode ? { backupCode: backupCode.trim() } : { mfaCode: mfaCode.trim() }),
            }
          : {}),
      }).unwrap();
      dispatch(loginSuccess({ token: result.accessToken }));
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (isFetchLikeError(error) && error.status === 'FETCH_ERROR') {
        dispatch(loginFailure('Unable to connect to API server. Check backend is running.'));
        return;
      }

      if (isFetchLikeError(error)) {
        const mfaChallenge = error.data as
          | { mfaRequired?: boolean; mfaToken?: string; message?: string }
          | undefined;

        if (mfaChallenge?.mfaRequired && typeof mfaChallenge.mfaToken === 'string') {
          setMfaRequired(true);
          setMfaToken(mfaChallenge.mfaToken);
          dispatch(loginFailure(mfaChallenge.message ?? 'MFA code required'));
          return;
        }

        const apiMessage = readApiErrorMessage(error.data);
        dispatch(loginFailure(apiMessage ?? 'Invalid email or password'));
        return;
      }

      dispatch(loginFailure('Login failed. Please try again.'));
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#fbfbfb' }}>
      <Container maxWidth="sm" sx={{ display: 'flex', flexDirection: 'column', py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Button
            component={RouterLink}
            to="/"
            startIcon={<ArrowBack />}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Back to Home
          </Button>
        </Box>

        <Box
          component="form"
          onSubmit={onSubmit}
          noValidate
          sx={{
            p: { xs: 3, md: 4 },
            bgcolor: 'white',
            borderRadius: '16px',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <LocalHospital sx={{ fontSize: 40, color: themeTokens.colors.primary, mb: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Sign In
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Access your MedCore clinical account
              </Typography>
            </Box>

            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              autoComplete="email"
              error={emailHasError}
              helperText={emailHasError ? 'Enter a valid email address' : ''}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (mfaRequired) setMfaRequired(false);
                if (authError) dispatch(clearAuthError());
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              autoComplete="current-password"
              error={passwordHasError}
              helperText={passwordHasError ? 'Password must be at least 8 characters' : ''}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (mfaRequired) setMfaRequired(false);
                if (authError) dispatch(clearAuthError());
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {mfaRequired && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: '8px',
                  bgcolor: alpha(themeTokens.colors.primary, 0.04),
                  border: `1px dashed ${alpha(themeTokens.colors.primary, 0.2)}`,
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  Two-Factor Authentication
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useBackupCode}
                      onChange={(event) => setUseBackupCode(event.target.checked)}
                    />
                  }
                  label={<Typography variant="body2">Use backup code</Typography>}
                />
                <TextField
                  label={useBackupCode ? 'Backup Code' : 'MFA Code'}
                  fullWidth
                  required
                  size="small"
                  sx={{ mt: 1, bgcolor: 'white' }}
                  value={useBackupCode ? backupCode : mfaCode}
                  onChange={(event) => {
                    if (useBackupCode) setBackupCode(event.target.value);
                    else setMfaCode(event.target.value);
                    if (authError) dispatch(clearAuthError());
                  }}
                />
              </Box>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
              }
              label={<Typography variant="body2">Remember me on this device</Typography>}
            />

            {authError && (
              <Alert severity="error" sx={{ borderRadius: '8px' }}>
                {authError}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isLoading}
              sx={{
                py: 1.5,
                borderRadius: '8px',
                bgcolor: themeTokens.colors.primary,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '1rem',
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <Typography variant="body2" align="center" sx={{ mt: 1 }}>
              Don't have an account?{' '}
              <Typography
                component={RouterLink}
                to="/register"
                sx={{
                  color: themeTokens.colors.primary,
                  textDecoration: 'none',
                  fontWeight: 600,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Create one
              </Typography>
            </Typography>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};
