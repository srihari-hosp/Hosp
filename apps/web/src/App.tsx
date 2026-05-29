import { useEffect, useState, type FC } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box, CssBaseline, Typography } from '@mui/material';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { MainContent } from './components/layout/MainContent';
import { DashboardPage } from './pages/DashboardPage';
import { PatientListPage } from './pages/patients/PatientListPage';
import { LoginPage } from './pages/patients/LoginPage';
import { RegisterPage } from './pages/patients/RegisterPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ConsentManagementPage } from './pages/ConsentManagementPage';
import { ExportMyDataPage } from './pages/ExportMyDataPage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { AppointmentCalendarPage } from './pages/AppointmentCalendarPage';
import { VisitFormPage } from './pages/VisitFormPage';
import { MFASetupPage } from './pages/MFASetupPage';
import { InvoiceListPage } from './pages/InvoiceListPage';
import { MedicineListPage } from './pages/MedicineListPage';
import { LabOrderListPage } from './pages/LabOrderListPage';
import { LandingPage } from './pages/LandingPage';
import { SecurityPage } from './pages/SecurityPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { HelpCenterPage } from './pages/HelpCenterPage';
import { ScalabilityPage } from './pages/ScalabilityPage';
import { ModulesPage } from './pages/ModulesPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { EnterprisePage } from './pages/EnterprisePage';
import { CommunityPage } from './pages/CommunityPage';
import { ContactPage } from './pages/ContactPage';
import { TermsPage } from './pages/TermsPage';
import { TrainingPage } from './pages/TrainingPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { useGetMeQuery, useRefreshSessionMutation } from './store/api';
import { loginStart, loginSuccess, logout } from './store/slices/authSlice';
import { clearUser, setUser } from './store/slices/userSlice';
import { clearTenantState, setCurrentTenant, setTenants } from './store/slices/tenantSlice';

type OnboardingState = {
  completed: boolean;
  tenantName?: string;
  tenantCode?: string;
  role?: string;
};

type OnboardingPayload = {
  tenantName: string;
  tenantCode?: string;
  role: 'ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST';
};

const ONBOARDING_STORAGE_KEY = 'hosp_onboarding_state';

const readOnboardingState = (): OnboardingState => {
  if (typeof window === 'undefined') {
    return { completed: false };
  }

  const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!raw) {
    return { completed: false };
  }

  try {
    const parsed = JSON.parse(raw) as OnboardingState;
    return {
      completed: Boolean(parsed?.completed),
      tenantName: typeof parsed?.tenantName === 'string' ? parsed.tenantName : undefined,
      tenantCode: typeof parsed?.tenantCode === 'string' ? parsed.tenantCode : undefined,
      role: typeof parsed?.role === 'string' ? parsed.role : undefined,
    };
  } catch {
    return { completed: false };
  }
};

const persistOnboardingState = (state: OnboardingState): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
};

const AuthLoading: FC = () => (
  <Box sx={{ p: 3 }}>
    <Typography>Checking session...</Typography>
  </Box>
);

const ProtectedLayout: FC<{ isOnboardingComplete: boolean }> = ({ isOnboardingComplete }) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const authStatus = useAppSelector((state) => state.auth.status);

  if (authStatus === 'loading') {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isOnboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <TopBar />
      <Sidebar />
      <MainContent>
        <Outlet />
      </MainContent>
    </Box>
  );
};

const LoginRoute: FC<{ isOnboardingComplete: boolean }> = ({ isOnboardingComplete }) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Navigate to={isOnboardingComplete ? '/dashboard' : '/onboarding'} replace />;
};

const RootRoute: FC<{ isOnboardingComplete: boolean }> = ({ isOnboardingComplete }) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={isOnboardingComplete ? '/dashboard' : '/onboarding'} replace />;
  }

  return <LandingPage />;
};

const OnboardingRoute: FC<{
  isOnboardingComplete: boolean;
  initialTenantName?: string;
  initialTenantCode?: string;
  initialRole?: string;
  onComplete: (payload: OnboardingPayload) => void;
}> = ({ isOnboardingComplete, initialTenantName, initialTenantCode, initialRole, onComplete }) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const authStatus = useAppSelector((state) => state.auth.status);

  if (authStatus === 'loading') {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isOnboardingComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <OnboardingPage
      initialTenantName={initialTenantName}
      initialTenantCode={initialTenantCode}
      initialRole={initialRole}
      onComplete={onComplete}
    />
  );
};

function App() {
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector((state) => state.auth.status);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const currentTenant = useAppSelector((state) => state.tenant.currentTenant);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(() =>
    readOnboardingState()
  );
  const isOnboardingComplete = onboardingState.completed;
  const [refreshSession] = useRefreshSessionMutation();
  const { data: meData } = useGetMeQuery(undefined, { skip: !isAuthenticated });

  useEffect(() => {
    if (authStatus !== 'idle') {
      return;
    }

    if (window.location.pathname === '/login') {
      return;
    }

    dispatch(loginStart());

    refreshSession()
      .unwrap()
      .then(() => {
        dispatch(loginSuccess());
      })
      .catch(() => {
        dispatch(logout());
        dispatch(clearUser());
        dispatch(clearTenantState());
      });
  }, [authStatus, dispatch, refreshSession]);

  useEffect(() => {
    if (!meData) {
      return;
    }

    const resolvedRole = onboardingState.role ?? meData.role;
    const resolvedTenantName = onboardingState.tenantName ?? currentTenant?.name ?? 'Current Tenant';
    const resolvedTenantCode = onboardingState.tenantCode ?? currentTenant?.code;

    dispatch(
      setUser({
        id: meData.id,
        name: meData.email.split('@')[0] ?? meData.email,
        email: meData.email,
        role: resolvedRole,
      })
    );
    dispatch(
      setCurrentTenant({
        id: meData.tenantId,
        name: resolvedTenantName,
        code: resolvedTenantCode,
      })
    );
  }, [
    currentTenant?.code,
    currentTenant?.name,
    dispatch,
    meData,
    onboardingState.role,
    onboardingState.tenantCode,
    onboardingState.tenantName,
  ]);

  const handleCompleteOnboarding = (payload: OnboardingPayload) => {
    const nextState: OnboardingState = {
      completed: true,
      tenantName: payload.tenantName,
      tenantCode: payload.tenantCode,
      role: payload.role,
    };
    setOnboardingState(nextState);
    persistOnboardingState(nextState);

    const tenantId = meData?.tenantId ?? currentTenant?.id ?? 'onboarding-tenant';
    dispatch(
      setCurrentTenant({
        id: tenantId,
        name: payload.tenantName,
        code: payload.tenantCode,
      })
    );
    dispatch(
      setTenants([
        {
          id: tenantId,
          name: payload.tenantName,
          code: payload.tenantCode,
        },
      ])
    );
  };

  return (
    <BrowserRouter>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<RootRoute isOnboardingComplete={isOnboardingComplete} />} />
        <Route path="/login" element={<LoginRoute isOnboardingComplete={isOnboardingComplete} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route
          path="/onboarding"
          element={
            <OnboardingRoute
              isOnboardingComplete={isOnboardingComplete}
              initialTenantName={onboardingState.tenantName}
              initialTenantCode={onboardingState.tenantCode}
              initialRole={onboardingState.role}
              onComplete={handleCompleteOnboarding}
            />
          }
        />

        <Route
          path="/"
          element={<ProtectedLayout isOnboardingComplete={isOnboardingComplete} />}
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="patients" element={<PatientListPage />} />
          <Route path="consents" element={<ConsentManagementPage />} />
          <Route path="export-my-data" element={<ExportMyDataPage />} />
          <Route path="status" element={<SystemStatusPage />} />
          <Route path="appointments" element={<AppointmentCalendarPage />} />
          <Route path="visit/:id" element={<VisitFormPage />} />
          <Route path="settings/mfa" element={<MFASetupPage />} />
          <Route path="billing" element={<InvoiceListPage />} />
          <Route path="pharmacy" element={<MedicineListPage />} />
          <Route path="lab" element={<LabOrderListPage />} />
          <Route path="settings/consent" element={<ConsentManagementPage />} />
        </Route>

        <Route path="security" element={<SecurityPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="help" element={<HelpCenterPage />} />
        <Route path="scalability" element={<ScalabilityPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="enterprise" element={<EnterprisePage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="departments" element={<DepartmentsPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
