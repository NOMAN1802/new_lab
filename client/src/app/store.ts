import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from '@/services/baseApi';
import { publicApi } from '@/services/publicApi';
import authReducer from '@/features/auth/authSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        [baseApi.reducerPath]: baseApi.reducer,
        // The patient QR surface. Separate from baseApi so a staff token is
        // never attached to it and a 401 there cannot log a receptionist out.
        [publicApi.reducerPath]: publicApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }).concat(baseApi.middleware, publicApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

