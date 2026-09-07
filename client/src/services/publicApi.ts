import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from './baseApi';

export type PublicSummary = {
    invoiceNumber: string;
    patientName: string;
    visitDate: string;
    isCancelled: boolean;
};

export type PublicReportItem = {
    itemId: string;
    testName: string;
    testCode: string;
    ready: boolean;
    originalName?: string;
    mimeType?: string;
};

export type PublicPayload =
    | { state: 'cancelled'; invoiceNumber: string; patientName: string; visitDate: string }
    | {
          state: 'unpaid';
          invoiceNumber: string;
          patientName: string;
          visitDate: string;
          netPayable: number;
          paidAmount: number;
          dueAmount: number;
      }
    | {
          state: 'ready';
          invoiceNumber: string;
          patientName: string;
          visitDate: string;
          items: PublicReportItem[];
      };

export type PublicVerifyResult = PublicPayload & { accessToken: string };

/**
 * A deliberately separate API slice from `baseApi`, not a tag on it.
 *
 * Two reasons, both about the staff session that may exist in the same
 * browser. `baseApi.prepareHeaders` attaches the logged-in receptionist's
 * bearer token to every request it makes, which has no business being sent to
 * a patient endpoint. And `baseQueryWithReauth` treats any 401 as a dead
 * session: it calls the refresh endpoint and dispatches `logout()` on failure.
 * A patient opening a stale QR link on the front desk's machine would
 * therefore sign the receptionist out.
 *
 * So this slice gets a plain fetchBaseQuery: no prepareHeaders, no reauth, and
 * no shared cache. The patient's own session token is passed per call instead.
 */
const publicBaseQuery = fetchBaseQuery({ baseUrl: API_BASE_URL });

export const publicApi = createApi({
    reducerPath: 'publicApi',
    baseQuery: publicBaseQuery,
    endpoints: (builder) => ({
        getPublicSummary: builder.query<PublicSummary, string>({
            query: (token) => `/public/reports/${token}`,
            transformResponse: (response: { data: PublicSummary }) => response.data,
        }),

        verifyPublicReport: builder.mutation<
            PublicVerifyResult,
            { token: string; last4: string }
        >({
            query: ({ token, last4 }) => ({
                url: `/public/reports/${token}/verify`,
                method: 'POST',
                body: { last4 },
            }),
            transformResponse: (response: { data: PublicVerifyResult }) => response.data,
        }),

        /**
         * Returns the raw bytes. The session token rides on this one call
         * rather than on the slice, so it can never leak onto the unverified
         * endpoints above.
         */
        getPublicReportFile: builder.mutation<
            Blob,
            { token: string; itemId: string; accessToken: string }
        >({
            query: ({ token, itemId, accessToken }) => ({
                url: `/public/reports/${token}/items/${itemId}/file`,
                headers: { authorization: `Bearer ${accessToken}` },
                responseHandler: async (response) =>
                    response.ok ? response.blob() : response.json(),
                cache: 'no-store',
            }),
        }),
    }),
});

export const {
    useGetPublicSummaryQuery,
    useVerifyPublicReportMutation,
    useGetPublicReportFileMutation,
} = publicApi;
