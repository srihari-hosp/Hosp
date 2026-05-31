export type TenantScopedEntity = {
  id: string;
  hospitalId: string;
  createdAt: string;
  updatedAt: string;
};

export type SharedPatient = TenantScopedEntity & {
  mrn: string;
  name: string;
  age: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string;
  email?: string | null;
  address?: string | null;
  patientType: "OPD" | "IPD";
};
