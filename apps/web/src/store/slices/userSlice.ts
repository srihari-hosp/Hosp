import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type UserState = {
  currentUser: User | null;
  status: "idle" | "loading" | "loaded";
  error: string | null;
};

const initialState: UserState = {
  currentUser: null,
  status: "idle",
  error: null,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserLoading: (state) => {
      state.status = "loading";
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.status = "loaded";
      state.error = null;
    },
    clearUser: (state) => {
      state.currentUser = null;
      state.status = "idle";
      state.error = null;
    },
    setUserError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.status = "idle";
    },
  },
});

export const { setUserLoading, setUser, clearUser, setUserError } = userSlice.actions;

export default userSlice.reducer;
