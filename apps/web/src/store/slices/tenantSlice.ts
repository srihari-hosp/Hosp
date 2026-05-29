import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Tenant = {
  id: string;
  name: string;
  code?: string;
};

export type TenantState = {
  currentTenant: Tenant | null;
  tenants: Tenant[];
};

const initialState: TenantState = {
  currentTenant: null,
  tenants: [],
};

export const tenantSlice = createSlice({
  name: "tenant",
  initialState,
  reducers: {
    setTenants: (state, action: PayloadAction<Tenant[]>) => {
      state.tenants = action.payload;
    },
    setCurrentTenant: (state, action: PayloadAction<Tenant | null>) => {
      state.currentTenant = action.payload;
    },
    clearTenantState: (state) => {
      state.currentTenant = null;
      state.tenants = [];
    },
  },
});

export const { setTenants, setCurrentTenant, clearTenantState } = tenantSlice.actions;

export default tenantSlice.reducer;
