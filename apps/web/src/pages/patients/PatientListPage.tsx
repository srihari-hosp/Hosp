import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Grid,
  alpha,
  InputAdornment,
} from '@mui/material';
import {
  PersonAdd,
  Search,
  AccountCircle,
  Phone,
  LocationOn,
  Badge,
  Wc,
  CalendarMonth,
} from '@mui/icons-material';
import { useCreatePatientMutation, useGetPatientsQuery, type Patient } from '../../store/api';

const themeTokens = {
  colors: {
    primary: '#005dac',
    text: {
      primary: '#1b1b1f',
      secondary: '#44474e',
    },
  },
};

type FormState = {
  name: string;
  age: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | '';
  mobile: string;
  aadhaar: string;
  address: string;
};

const initialFormState: FormState = {
  name: '',
  age: '',
  gender: '',
  mobile: '',
  aadhaar: '',
  address: '',
};

const isValidIndianMobile = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(normalized);
};

const normalizeIndianMobile = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return `+91${normalized}`;
};

const isValidAadhaar = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  return /^\d{12}$/.test(digits);
};

const normalizeAadhaar = (value: string): string => value.replace(/\D/g, '');

const buildMrn = (): string => {
  const stamp = Date.now().toString().slice(-6);
  const suffix = Math.floor(Math.random() * 900 + 100).toString();
  return `MRN-${stamp}${suffix}`;
};

const readErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') return 'Request failed.';
  const parsed = error as { status?: unknown; data?: { message?: string; error?: string }; message?: string };
  if (parsed.status === 'FETCH_ERROR') return 'Unable to connect to API server.';
  return parsed.data?.message ?? parsed.data?.error ?? parsed.message ?? 'Request failed.';
};

export const PatientListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormState>(initialFormState);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: patients = [] } = useGetPatientsQuery(
    search.trim() ? { search } : undefined
  );

  const [createPatient, { isLoading: isCreating }] = useCreatePatientMutation();

  const validation = useMemo(() => {
    const ageNum = Number(form.age);
    return {
      name: form.name.trim().length >= 2,
      age: Number.isFinite(ageNum) && ageNum >= 0,
      gender: !!form.gender,
      mobile: isValidIndianMobile(form.mobile.trim()),
      aadhaar: isValidAadhaar(form.aadhaar.trim()),
      address: form.address.trim().length >= 3,
    };
  }, [form]);

  const isFormValid = Object.values(validation).every((v) => v);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormSubmitted(true);
    if (!isFormValid) return;

    try {
      const result = await createPatient({
        mrn: buildMrn(),
        name: form.name.trim(),
        age: Number(form.age),
        gender: form.gender as 'MALE' | 'FEMALE' | 'OTHER',
        phone: normalizeIndianMobile(form.mobile.trim()),
        aadhaarNumber: normalizeAadhaar(form.aadhaar.trim()),
        address: form.address.trim(),
        patientType: 'OPD',
      }).unwrap();

      setSuccessMessage(result.message ?? 'Patient added successfully.');
      setForm(initialFormState);
      setFormSubmitted(false);
    } catch (submitErr) {
      setSubmitError(readErrorMessage(submitErr));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
            Patient Management
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Register and manage your hospital's patient records.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: '16px', borderColor: 'rgba(0,0,0,0.06)' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <PersonAdd fontSize="small" sx={{ color: themeTokens.colors.primary }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              New Registration
            </Typography>
          </Stack>

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Name"
                  fullWidth
                  size="small"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  error={formSubmitted && !validation.name}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircle fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <TextField
                  label="Age"
                  fullWidth
                  size="small"
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  error={formSubmitted && !validation.age}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarMonth fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <TextField
                  select
                  label="Gender"
                  fullWidth
                  size="small"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as 'MALE' | 'FEMALE' | 'OTHER' })}
                  error={formSubmitted && !validation.gender}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Wc fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                >
                  <MenuItem value="MALE">Male</MenuItem>
                  <MenuItem value="FEMALE">Female</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Mobile"
                  fullWidth
                  size="small"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  error={formSubmitted && !validation.mobile}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Aadhaar"
                  fullWidth
                  size="small"
                  value={form.aadhaar}
                  onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
                  error={formSubmitted && !validation.aadhaar}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Badge fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  label="Address"
                  fullWidth
                  size="small"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  error={formSubmitted && !validation.address}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Stack direction="row" spacing={2} justifyContent="flex-end" alignItems="center">
                  {(successMessage || submitError) && (
                    <Typography
                      variant="caption"
                      color={successMessage ? 'success.main' : 'error.main'}
                      sx={{ fontWeight: 600 }}
                    >
                      {successMessage || submitError}
                    </Typography>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    disableElevation
                    disabled={isCreating}
                    sx={{
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 600,
                      bgcolor: themeTokens.colors.primary,
                    }}
                  >
                    {isCreating ? 'Saving...' : 'Register Patient'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: '16px', borderColor: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <Box sx={{ p: 2, bgcolor: alpha(themeTokens.colors.primary, 0.02), borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Recent Patients
              </Typography>
              <TextField
                placeholder="Search..."
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: 240,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    bgcolor: 'white',
                  },
                }}
              />
            </Stack>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>MRN</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Gender/Age</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.map((patient: Patient) => (
                  <TableRow key={patient.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{patient.name}</TableCell>
                    <TableCell>{patient.mrn}</TableCell>
                    <TableCell>
                      {patient.gender} / {patient.age}
                    </TableCell>
                    <TableCell>{patient.phone}</TableCell>
                    <TableCell>{patient.patientType}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
};
