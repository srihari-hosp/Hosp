import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  type FetchBaseQueryMeta,
  type QueryReturnValue,
} from "@reduxjs/toolkit/query/react";
import { loginSuccess, logout } from "./slices/authSlice";

export type Patient = {
  id: string;
  mrn: string;
  aadhaarNumber?: string | null;
  name: string;
  age: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string;
  email?: string | null;
  address?: string | null;
  consentStatus?: "GRANTED" | "REVOKED" | null;
  patientType: "OPD" | "IPD";
};

export type ConsentRecord = {
  id: string;
  purpose: string;
  dataTypes: string[];
  expiryAt: string | null;
  status: "GRANTED" | "REVOKED";
  grantedAt: string;
  revokedAt: string | null;
  patientId: string;
  hospitalId: string;
  patient: {
    id: string;
    mrn: string;
    name: string;
  };
};

export type Doctor = {
  id: string;
  name: string;
  specialization?: string | null;
  isActive: boolean;
};

export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    mrn: string;
    name: string;
  };
  doctor: {
    id: string;
    name: string;
    specialization?: string | null;
  };
};

export type VisitPrescription = {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string | null;
  pdfPath?: string | null;
  pdfUrl?: string | null;
  pdfGeneratedAt?: string | null;
  hospitalId: string;
  visitId: string;
  createdAt: string;
  updatedAt: string;
};

export type VisitRecord = {
  id: string;
  chiefComplaint: string;
  diagnosis?: string | null;
  notes?: string | null;
  visitedAt: string;
  hospitalId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    mrn: string;
    name: string;
  };
  doctor: {
    id: string;
    name: string;
    specialization?: string | null;
  };
  appointment: {
    id: string;
    scheduledAt: string;
    status: AppointmentStatus;
  };
  prescriptions: VisitPrescription[];
};

export type InvoiceStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  gstRate: string;
  lineSubtotal: string;
  lineGst: string;
  lineTotal: string;
  tariffItemId?: string | null;
};

export type PaymentRecord = {
  id: string;
  amount: string;
  method: "CASH" | "CARD" | "UPI" | "NET_BANKING" | "WALLET" | "OTHER";
  referenceNo?: string | null;
  notes?: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  invoiceYear: number;
  invoiceMonth: number;
  invoiceSeq: number;
  status: InvoiceStatus;
  subtotal: string;
  gstTotal: string;
  total: string;
  amountPaid: string;
  dueDate?: string | null;
  notes?: string | null;
  pdfPath?: string | null;
  pdfUrl?: string | null;
  pdfGeneratedAt?: string | null;
  hospitalId: string;
  patientId: string;
  visitId?: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    mrn: string;
    name: string;
    phone: string;
  };
  visit?: {
    id: string;
    chiefComplaint: string;
    diagnosis?: string | null;
    visitedAt: string;
    doctor: {
      id: string;
      name: string;
      specialization?: string | null;
    };
  } | null;
  items: InvoiceItem[];
  payments: PaymentRecord[];
};

export type MedicineSchedule = "OTC" | "H" | "H1" | "X" | "NARCOTIC";

export type MedicineRecord = {
  id: string;
  code: string;
  name: string;
  genericName?: string | null;
  manufacturer?: string | null;
  hsnCode: string;
  gstRate: string;
  unitPrice: string;
  scheduleCategory: MedicineSchedule;
  isActive: boolean;
  hospitalId: string;
  createdAt: string;
  updatedAt: string;
};

export type StockBatchRecord = {
  id: string;
  batchNo: string;
  vendorName?: string | null;
  expiryDate: string;
  receivedQty: number;
  availableQty: number;
  purchasePrice?: string | null;
  mrp: string;
  receivedAt: string;
  notes?: string | null;
  isActive: boolean;
  hospitalId: string;
  medicineId: string;
  createdAt: string;
  updatedAt: string;
};

export type DispenseRecord = {
  id: string;
  quantity: number;
  unitPrice: string;
  gstRate: string;
  totalAmount: string;
  dispensedAt: string;
  notes?: string | null;
  hospitalId: string;
  patientId: string;
  prescriptionId: string;
  medicineId: string;
  stockBatchId: string;
  dispensedById?: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    mrn: string;
    name: string;
  };
  medicine: {
    id: string;
    code: string;
    name: string;
  };
  stockBatch: {
    id: string;
    batchNo: string;
    expiryDate: string;
  };
};

export type LabOrderStatus =
  | "ORDERED"
  | "SAMPLE_COLLECTED"
  | "RESULT_UPDATED"
  | "COMPLETED"
  | string;

export type LabResultStatus = "DRAFT" | "FINAL" | "CORRECTED" | string;

export type LabTestRecord = {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  sampleType?: string | null;
  defaultUnit?: string | null;
  referenceRange?: string | null;
  instructions?: string | null;
  isActive: boolean;
  hospitalId: string;
  createdAt: string;
  updatedAt: string;
};

export type LabResultRecord = {
  id: string;
  status: LabResultStatus;
  resultValue?: string | null;
  unit?: string | null;
  referenceRange?: string | null;
  interpretation?: string | null;
  remarks?: string | null;
  observedAt?: string | null;
  reportedAt?: string | null;
  verifiedAt?: string | null;
  hospitalId: string;
  labOrderId: string;
  patientId: string;
  labTestId: string;
  recordedById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LabOrderRecord = {
  id: string;
  orderNumber: string;
  priority: string;
  status: LabOrderStatus;
  notes?: string | null;
  clinicalNotes?: string | null;
  orderedAt: string;
  collectedAt?: string | null;
  completedAt?: string | null;
  hospitalId: string;
  patientId: string;
  doctorId: string;
  visitId?: string | null;
  labTestId: string;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    mrn: string;
    name: string;
    age: number;
    gender: "MALE" | "FEMALE" | "OTHER" | string;
  };
  doctor: {
    id: string;
    name: string;
    specialization?: string | null;
  };
  labTest: {
    id: string;
    code: string;
    name: string;
    category?: string | null;
    sampleType?: string | null;
    defaultUnit?: string | null;
    referenceRange?: string | null;
    instructions?: string | null;
  };
  result?: LabResultRecord | null;
};

export type DashboardSummary = {
  totalPatients: number;
  todayAppointments: number;
  revenueLast7Days: number;
  revenueLast30Days: number;
};

export type DashboardSummaryResponse = {
  summary: DashboardSummary;
  generatedAt: string;
  cacheTtlSeconds: number;
};

export type DashboardAppointmentTrendPoint = {
  date: string;
  count: number;
};

export type DashboardRevenueTrendPoint = {
  date: string;
  revenue: number;
};

export type DashboardAppointmentsTrendResponse = {
  days: number;
  trend: DashboardAppointmentTrendPoint[];
  generatedAt: string;
  cacheTtlSeconds: number;
};

export type DashboardRevenueTrendResponse = {
  days: number;
  trend: DashboardRevenueTrendPoint[];
  generatedAt: string;
  cacheTtlSeconds: number;
};

type PatientsResponse = {
  patients: Patient[];
};

type ConsentsResponse = {
  consents: Array<Partial<ConsentRecord>>;
};

type DoctorsResponse = {
  doctors: Doctor[];
};

type AppointmentsResponse = {
  appointments: Appointment[];
};

type InvoicesResponse = {
  invoices: InvoiceRecord[];
};

type InvoiceResponse = {
  invoice: InvoiceRecord;
};

type MedicinesResponse = {
  medicines: MedicineRecord[];
};

type MedicineResponse = {
  medicine: MedicineRecord;
};

type BatchesResponse = {
  batches: StockBatchRecord[];
};

type LabTestsResponse = {
  tests: LabTestRecord[];
};

type LabOrdersResponse = {
  orders: LabOrderRecord[];
};

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const baseUrl =
  configuredApiUrl && configuredApiUrl.length > 0
    ? configuredApiUrl
    : import.meta.env.PROD && typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3001";

type LoginRequest = {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
  backupCode?: string;
  mfaToken?: string;
};

type AuthResponse = {
  success?: boolean;
  message?: string;
  mfaRequired?: boolean;
  mfaToken?: string;
  backupCodes?: string[];
  secret?: string;
  otpauthUrl?: string;
  qrCodeDataUrl?: string;
};
export type MyDataExport = {
  exportedAt: string;
  user: {
    id: string;
    email: string;
    role: string;
    hospitalId: string;
    mfaEnabled: boolean;
    createdAt: string;
    updatedAt: string;
  };
  tenant: {
    id: string;
    name: string;
    address: string;
    email: string | null;
    phone: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  activityLogs: Array<{
    id: string;
    entityType: string;
    entityId: string | null;
    changesJson: unknown;
    consentVersion: string | null;
    purpose: string | null;
    retentionPolicy: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    timestamp: string;
  }>;
};

type RegisterRequest = {
  hospitalName: string;
  address?: string;
  phone?: string;
  email: string;
  password: string;
  licenseNo: string;
  gstin?: string;
};

type CreatePatientRequest = {
  mrn: string;
  aadhaarNumber?: string;
  name: string;
  age: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string;
  address?: string;
  patientType: "OPD" | "IPD";
};

type GrantConsentRequest = {
  patientId: string;
  purpose: string;
  dataTypes?: string[];
  expiryAt?: string;
};

type ListAppointmentsParams = {
  date?: string;
  doctorId?: string;
  status?: AppointmentStatus;
};

type CreateAppointmentRequest = {
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  notes: string;
};

type UpdateAppointmentStatusRequest = {
  id: string;
  status: Exclude<AppointmentStatus, "SCHEDULED">;
};

type AvailabilityParams = {
  doctorId: string;
  date: string;
};

type AvailabilityResponse = {
  doctorId: string;
  date: string;
  slotMinutes: number;
  openSlots: string[];
};

type CreateVisitRequest = {
  appointmentId: string;
  chiefComplaint: string;
  diagnosis: string;
  notes?: string;
};

type AddPrescriptionRequest = {
  visitId: string;
  medication: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
};

type ListInvoicesParams = {
  status?: InvoiceStatus;
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
};

type CreateInvoiceItemInput = {
  tariffItemId?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
};

export type CreateInvoiceRequest = {
  patientId: string;
  visitId?: string;
  dueDate?: string;
  notes?: string;
  items: CreateInvoiceItemInput[];
};

export type RecordInvoicePaymentRequest = {
  id: string;
  amount: number;
  method: PaymentRecord["method"];
  referenceNo?: string;
  notes?: string;
};

type ListMedicinesParams = {
  search?: string;
  schedule?: MedicineSchedule;
  isActive?: boolean;
};

type CreateMedicineRequest = {
  code?: string;
  name: string;
  genericName?: string;
  manufacturer?: string;
  hsnCode: string | number;
  gstRate?: number;
  unitPrice: number;
  schedule?: MedicineSchedule;
  scheduleCategory?: MedicineSchedule;
  isActive?: boolean;
};

type ListMedicineBatchesParams = {
  medicineId: string;
  includeExpired?: boolean;
};

type DispenseMedicineRequest = {
  prescriptionId: string;
  medicineId: string;
  quantity: number;
  stockBatchId?: string;
  notes?: string;
};

type ListLabOrdersParams = {
  status?: string;
  patientId?: string;
};

type CreateLabOrderRequest = {
  patientId: string;
  doctorId: string;
  labTestId: string;
  visitId?: string;
  priority?: "ROUTINE" | "URGENT" | "STAT";
  notes?: string;
  clinicalNotes?: string;
};

type UpdateLabResultRequest = {
  orderId: string;
  resultValue?: string;
  unit?: string;
  referenceRange?: string;
  interpretation?: string;
  remarks?: string;
  status?: "DRAFT" | "FINAL" | "CORRECTED";
  observedAt?: string;
  reportedAt?: string;
  verifiedAt?: string;
  collectedAt?: string;
};

type DashboardTrendParams = {
  days?: number;
};

type QueueName = "pdf-generation" | "invoice-pdf" | "notifications" | "data-archival";

type QueueStatusResponse = {
  status: string;
  timestamp: string;
  queues: Record<
    QueueName,
    {
      waiting?: number;
      active?: number;
      completed?: number;
      failed?: number;
      delayed?: number;
      paused?: number;
    }
  >;
  job?: {
    id: string | null;
    name: string;
    state: string;
    attemptsMade: number;
    failedReason: string | null;
    processedOn: number | null;
    finishedOn: number | null;
    returnvalue: {
      prescriptionId?: string;
      invoiceId?: string;
      pdfPath?: string;
      pdfUrl?: string;
      generatedAt?: string;
    } | null;
  } | null;
};

export type MeUser = {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  hospitalId: string;
  mfaEnabled?: boolean;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: AuthState }).auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const isUnauthorized = (error?: FetchBaseQueryError): boolean => {
  if (!error) return false;
  return typeof error.status === "number" && error.status === 401;
};

const getRequestUrl = (args: string | FetchArgs): string =>
  typeof args === "string" ? args : args.url;

let refreshPromise: Promise<boolean> | null = null;

const refreshAccessToken = async (
  api: Parameters<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>>[1]
): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshResult = (await rawBaseQuery(
        {
          url: "/auth/refresh",
          method: "POST",
        },
        api,
        {}
      )) as QueryReturnValue<{ accessToken?: string }, FetchBaseQueryError, FetchBaseQueryMeta>;

      if (refreshResult.error) {
        api.dispatch(logout());
        return false;
      }

      const newToken = refreshResult.data?.accessToken;
      api.dispatch(loginSuccess({ token: newToken }));

      return true;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise ?? false;
};

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (isUnauthorized(result.error)) {
    const requestUrl = getRequestUrl(args);

    if (
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/logout")
    ) {
      api.dispatch(logout());
      return result;
    }

    const refreshed = await refreshAccessToken(api);

    if (refreshed) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  tagTypes: ["Consent", "Patient", "Appointment", "Doctor", "Visit", "Invoice", "Pharmacy", "Lab", "Dashboard"],
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body,
      }),
    }),
    refreshSession: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: "/auth/refresh",
        method: "POST",
      }),
    }),
    logout: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
    getMe: builder.query<MeUser, void>({
      query: () => "/auth/me",
      transformResponse: (response: unknown) => {
        const parsed = response as {
          data?: {
            user?: Partial<MeUser>;
          };
        };

        const user = parsed?.data?.user;
        if (!user?.id || !user?.email || !user?.role || !user?.hospitalId) {
          throw new Error("Invalid me response");
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          hospitalId: user.hospitalId,
          tenantId: user.tenantId ?? user.hospitalId,
          mfaEnabled: Boolean(user.mfaEnabled),
        };
      },
    }),
    setupMfa: builder.mutation<
      {
        success: boolean;
        message?: string;
        secret: string;
        otpauthUrl: string;
        qrCodeDataUrl: string;
      },
      void
    >({
      query: () => ({
        url: "/api/auth/mfa/setup",
        method: "POST",
      }),
    }),
    verifyMfa: builder.mutation<{ success: boolean; verified: boolean; message?: string }, { code: string }>({
      query: (body) => ({
        url: "/api/auth/mfa/verify",
        method: "POST",
        body,
      }),
    }),
    enableMfa: builder.mutation<{ success: boolean; message?: string; backupCodes: string[] }, { code: string }>({
      query: (body) => ({
        url: "/api/auth/mfa/enable",
        method: "POST",
        body,
      }),
    }),
    disableMfa: builder.mutation<{ success: boolean; message?: string }, void>({
      query: () => ({
        url: "/api/auth/mfa/disable",
        method: "POST",
      }),
    }),
    generateBackupCodes: builder.query<{ success: boolean; message?: string; backupCodes: string[] }, void>({
      query: () => "/api/auth/mfa/backup-codes",
    }),
    exportMyData: builder.query<MyDataExport, void>({
      query: () => "/auth/export-my-data",
    }),
    getDashboardSummary: builder.query<DashboardSummaryResponse, void>({
      query: () => "/api/dashboard/summary",
      providesTags: ["Dashboard"],
    }),
    getDashboardAppointmentsTrend: builder.query<DashboardAppointmentsTrendResponse, DashboardTrendParams | void>({
      query: (params) => {
        const days = params?.days ?? 7;
        return `/api/dashboard/appointments-trend?days=${encodeURIComponent(String(days))}`;
      },
      providesTags: ["Dashboard"],
    }),
    getDashboardRevenueTrend: builder.query<DashboardRevenueTrendResponse, DashboardTrendParams | void>({
      query: (params) => {
        const days = params?.days ?? 30;
        return `/api/dashboard/revenue-trend?days=${encodeURIComponent(String(days))}`;
      },
      providesTags: ["Dashboard"],
    }),
    getPatients: builder.query<Patient[], { search?: string } | void>({
      query: (params) => {
        const search = params && "search" in params ? params.search?.trim() : undefined;
        const queryString = search ? `?search=${encodeURIComponent(search)}` : "";
        return `/patients${queryString}`;
      },
      providesTags: ["Patient"],
      transformResponse: (response: PatientsResponse) => response.patients ?? [],
    }),
    createPatient: builder.mutation<{ success: boolean; message?: string; patient?: Patient }, CreatePatientRequest>({
      query: (body) => ({
        url: "/patients",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Patient"],
    }),
    getConsents: builder.query<ConsentRecord[], void>({
      query: () => "/consents",
      providesTags: ["Consent"],
      transformResponse: (response: ConsentsResponse) =>
        (response.consents ?? []).map((record) => ({
          id: record.id ?? "",
          purpose: record.purpose ?? "",
          dataTypes: Array.isArray(record.dataTypes) ? record.dataTypes : [],
          expiryAt: record.expiryAt ?? null,
          status: record.status === "REVOKED" ? "REVOKED" : "GRANTED",
          grantedAt: record.grantedAt ?? "",
          revokedAt: record.revokedAt ?? null,
          patientId: record.patientId ?? "",
          hospitalId: record.hospitalId ?? "",
          patient: {
            id: record.patient?.id ?? "",
            mrn: record.patient?.mrn ?? "",
            name: record.patient?.name ?? "",
          },
        })),
    }),
    grantConsent: builder.mutation<AuthResponse, GrantConsentRequest>({
      query: (body) => ({
        url: "/consents",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Consent"],
    }),
    withdrawConsent: builder.mutation<AuthResponse, string>({
      query: (consentId) => ({
        url: `/consents/${consentId}/withdraw`,
        method: "PATCH",
      }),
      invalidatesTags: ["Consent"],
    }),
    getDoctors: builder.query<Doctor[], void>({
      query: () => "/api/appointments/doctors",
      providesTags: ["Doctor"],
      transformResponse: (response: DoctorsResponse) => response.doctors ?? [],
    }),
    getAppointments: builder.query<Appointment[], ListAppointmentsParams | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.date) {
          search.set("date", params.date);
        }
        if (params?.doctorId) {
          search.set("doctorId", params.doctorId);
        }
        if (params?.status) {
          search.set("status", params.status);
        }
        const queryString = search.toString();
        return `/api/appointments${queryString ? `?${queryString}` : ""}`;
      },
      providesTags: ["Appointment"],
      transformResponse: (response: AppointmentsResponse) => response.appointments ?? [],
    }),
    createAppointment: builder.mutation<{ success: boolean; message?: string; appointment?: Appointment }, CreateAppointmentRequest>({
      query: (body) => ({
        url: "/api/appointments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appointment"],
    }),
    updateAppointmentStatus: builder.mutation<{ success: boolean; message?: string; appointment?: Appointment }, UpdateAppointmentStatusRequest>({
      query: ({ id, status }) => ({
        url: `/api/appointments/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Appointment"],
    }),
    createVisit: builder.mutation<{ success: boolean; message?: string; visit: VisitRecord }, CreateVisitRequest>({
      query: (body) => ({
        url: "/api/visits",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appointment", "Visit"],
    }),
    getVisit: builder.query<VisitRecord, string>({
      query: (visitId) => `/api/visits/${visitId}`,
      transformResponse: (response: { visit: VisitRecord }) => response.visit,
      providesTags: ["Visit"],
    }),
    getVisitByAppointment: builder.query<VisitRecord | null, string>({
      query: (appointmentId) => `/api/visits/by-appointment/${appointmentId}`,
      transformResponse: (response: { visit: VisitRecord | null }) => response.visit ?? null,
      providesTags: ["Visit"],
    }),
    addVisitPrescription: builder.mutation<
      { success: boolean; message?: string; jobId: string; prescription: VisitPrescription },
      AddPrescriptionRequest
    >({
      query: ({ visitId, ...body }) => ({
        url: `/api/visits/${visitId}/prescription`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Visit"],
    }),
    getQueueJobStatus: builder.query<QueueStatusResponse, { queue: QueueName; jobId: string }>({
      query: ({ queue, jobId }) =>
        `/api/queues/status?queue=${encodeURIComponent(queue)}&jobId=${encodeURIComponent(jobId)}`,
    }),
    getInvoices: builder.query<InvoiceRecord[], ListInvoicesParams | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.status) {
          search.set("status", params.status);
        }
        if (params?.patientId) {
          search.set("patientId", params.patientId);
        }
        if (params?.dateFrom) {
          search.set("dateFrom", params.dateFrom);
        }
        if (params?.dateTo) {
          search.set("dateTo", params.dateTo);
        }
        const queryString = search.toString();
        return `/api/invoices${queryString ? `?${queryString}` : ""}`;
      },
      providesTags: ["Invoice"],
      transformResponse: (response: InvoicesResponse) => response.invoices ?? [],
    }),
    getInvoice: builder.query<InvoiceRecord, string>({
      query: (invoiceId) => `/api/invoices/${invoiceId}`,
      providesTags: (_result, _error, id) => [{ type: "Invoice", id }],
      transformResponse: (response: InvoiceResponse) => response.invoice,
    }),
    createInvoice: builder.mutation<
      { success: boolean; message?: string; invoice?: InvoiceRecord },
      CreateInvoiceRequest
    >({
      query: (body) => ({
        url: "/api/invoices",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Invoice"],
    }),
    recordInvoicePayment: builder.mutation<
      { success: boolean; message?: string; payment?: PaymentRecord; invoice?: InvoiceRecord },
      RecordInvoicePaymentRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/api/invoices/${id}/payment`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => ["Invoice", { type: "Invoice", id: arg.id }],
    }),
    getMedicines: builder.query<MedicineRecord[], ListMedicinesParams | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.search) {
          search.set("search", params.search);
        }
        if (params?.schedule) {
          search.set("schedule", params.schedule);
        }
        if (typeof params?.isActive === "boolean") {
          search.set("isActive", String(params.isActive));
        }
        const queryString = search.toString();
        return `/api/pharmacy/medicines${queryString ? `?${queryString}` : ""}`;
      },
      providesTags: ["Pharmacy"],
      transformResponse: (response: MedicinesResponse) => response.medicines ?? [],
    }),
    createMedicine: builder.mutation<{ success: boolean; message?: string; medicine?: MedicineRecord }, CreateMedicineRequest>({
      query: (body) => ({
        url: "/api/pharmacy/medicines",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Pharmacy"],
    }),
    getMedicine: builder.query<MedicineRecord, string>({
      query: (medicineId) => `/api/pharmacy/medicines/${medicineId}`,
      transformResponse: (response: MedicineResponse) => response.medicine,
      providesTags: ["Pharmacy"],
    }),
    getMedicineBatches: builder.query<StockBatchRecord[], ListMedicineBatchesParams>({
      query: ({ medicineId, includeExpired }) =>
        `/api/pharmacy/medicines/${medicineId}/batches${includeExpired ? "?includeExpired=true" : ""}`,
      transformResponse: (response: BatchesResponse) => response.batches ?? [],
      providesTags: ["Pharmacy"],
    }),
    dispenseMedicine: builder.mutation<
      {
        success: boolean;
        message?: string;
        dispenseRecord?: DispenseRecord;
        stockBatch?: StockBatchRecord;
      },
      DispenseMedicineRequest
    >({
      query: (body) => ({
        url: "/api/pharmacy/dispense",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Pharmacy"],
    }),
    getLabTests: builder.query<LabTestRecord[], void>({
      query: () => "/api/labs/tests",
      providesTags: ["Lab"],
      transformResponse: (response: LabTestsResponse) => response.tests ?? [],
    }),
    getLabOrders: builder.query<LabOrderRecord[], ListLabOrdersParams | void>({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.status) {
          search.set("status", params.status);
        }
        if (params?.patientId) {
          search.set("patientId", params.patientId);
        }
        const queryString = search.toString();
        return `/api/labs/orders${queryString ? `?${queryString}` : ""}`;
      },
      providesTags: ["Lab"],
      transformResponse: (response: LabOrdersResponse) => response.orders ?? [],
    }),
    createLabOrder: builder.mutation<{ success: boolean; message?: string; order: LabOrderRecord }, CreateLabOrderRequest>({
      query: (body) => ({
        url: "/api/labs/orders",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Lab"],
    }),
    updateLabResult: builder.mutation<
      { success: boolean; message?: string; order: LabOrderRecord; result: LabResultRecord },
      UpdateLabResultRequest
    >({
      query: ({ orderId, ...body }) => ({
        url: `/api/labs/orders/${orderId}/result`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Lab"],
    }),
    generateInvoicePdf: builder.mutation<
      {
        success: boolean;
        message?: string;
        jobId: string;
        invoice: {
          id: string;
          invoiceNumber: string;
          pdfUrl?: string | null;
          pdfGeneratedAt?: string | null;
        };
      },
      string
    >({
      query: (invoiceId) => ({
        url: `/api/invoices/${invoiceId}/pdf`,
        method: "POST",
      }),
      invalidatesTags: ["Invoice"],
    }),
    getAppointmentAvailability: builder.query<AvailabilityResponse, AvailabilityParams>({
      query: ({ doctorId, date }) =>
        `/api/appointments/availability?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`,
    }),
  }),
});

export const {
  useGetConsentsQuery,
  useExportMyDataQuery,
  useGetDashboardSummaryQuery,
  useGetDashboardAppointmentsTrendQuery,
  useGetDashboardRevenueTrendQuery,
  useCreatePatientMutation,
  useGetPatientsQuery,
  useGrantConsentMutation,
  useGetMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useWithdrawConsentMutation,
  useRefreshSessionMutation,
  useRegisterMutation,
  useGetDoctorsQuery,
  useGetAppointmentsQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentStatusMutation,
  useCreateVisitMutation,
  useGetVisitQuery,
  useGetVisitByAppointmentQuery,
  useAddVisitPrescriptionMutation,
  useLazyGetQueueJobStatusQuery,
  useGenerateInvoicePdfMutation,
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useRecordInvoicePaymentMutation,
  useGetMedicinesQuery,
  useCreateMedicineMutation,
  useGetMedicineQuery,
  useGetMedicineBatchesQuery,
  useLazyGetMedicineBatchesQuery,
  useDispenseMedicineMutation,
  useGetLabTestsQuery,
  useGetLabOrdersQuery,
  useCreateLabOrderMutation,
  useUpdateLabResultMutation,
  useGetAppointmentAvailabilityQuery,
  useSetupMfaMutation,
  useVerifyMfaMutation,
  useEnableMfaMutation,
  useDisableMfaMutation,
  useLazyGenerateBackupCodesQuery,
} = api;
