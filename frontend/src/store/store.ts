import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "./api/baseApi";
import authReducer from "./slices/authSlice";
import workspaceReducer from "./slices/workspaceSlice";

// Explicitly register all injected API slices so the entire API module graph is bundled in lockstep
import "./api/authApi";
import "./api/workspaceApi";
import "./api/teamApi";
import "./api/networkApi";
import "./api/fleetApi";

export function makeStore() {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
      workspace: workspaceReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(baseApi.middleware),
  });

  setupListeners(store.dispatch);
  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
