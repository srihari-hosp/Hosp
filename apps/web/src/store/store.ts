import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { api } from "./api";
import authReducer from "./slices/authSlice";
import userReducer from "./slices/userSlice";
import tenantReducer from "./slices/tenantSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    tenant: tenantReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
