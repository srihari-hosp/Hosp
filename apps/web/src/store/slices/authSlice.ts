import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export type AuthState = {
  isAuthenticated: boolean;
  token: string | null;
  status: AuthStatus;
  error: string | null;
};

const initialState: AuthState = {
  isAuthenticated: false,
  token: null,
  status: "idle",
  error: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart: (state) => {
      state.status = "loading";
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ token?: string } | undefined>) => {
      state.isAuthenticated = true;
      state.status = "authenticated";
      state.error = null;
      if (action.payload?.token) {
        state.token = action.payload.token;
      }
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = false;
      state.token = null;
      state.status = "unauthenticated";
      state.error = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.status = "unauthenticated";
      state.error = null;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, clearAuthError } = authSlice.actions;

export default authSlice.reducer;
