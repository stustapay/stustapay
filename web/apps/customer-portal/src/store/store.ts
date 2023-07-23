import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/dist/query";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { authSlice } from "./authSlice";
import { uiSlice } from "./uiSlice";
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { errorMiddleware } from "./errorMiddleware";
import { api } from "@/api";

const authPersistConfig = {
  key: "auth",
  version: 1,
  storage,
};

const uiPersistConfig = {
  key: "ui",
  version: 1,
  storage,
};

export const store = configureStore({
  reducer: combineReducers({
    [authSlice.name]: persistReducer(authPersistConfig, authSlice.reducer),
    [uiSlice.name]: persistReducer(uiPersistConfig, uiSlice.reducer),
    [api.reducerPath]: api.reducer,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] },
    })
      .concat(api.middleware)
      .concat(errorMiddleware),
});

export const persistor = persistStore(store);

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
