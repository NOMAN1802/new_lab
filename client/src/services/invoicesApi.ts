import { baseApi } from './baseApi';
import { cleanParams, toPaginated } from './types';
import type { ApiResponse, ListQuery, Paginated } from './types';
import type { Patient } from './patientsApi';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type ReportStatus = 'pending' | 'uploaded' | 'delivered';

export type ReportFile = {
    url: string;
    publicId: string;
    resourceType: string;
    mimeType: string;
    originalName: string;
    size: number;
    uploadedAt: string;
};

export type InvoiceItem = {
    _id: string;
    test: string;
    testCode: string;
    testName: string;
    categoryName?: string;
    price: number;
    reportStatus: ReportStatus;
    reportFile?: ReportFile;
    deliveredAt?: string;
};

/**
 * Per-invoice figures come through in full for both roles — the commission
 * line prints on the invoice. commission* stays optional because a walk-in
 * with no referrer accrues none; render it only when present rather than
 * falling back to 0.
 */
export type Invoice = {
    _id: string;
    invoiceNumber: string;
    visitDate: string;

    patient: string | Patient;
    patientInfo: {
        patientId: string;
        name: string;
        age: number;
        gender: string;
        phone: string;
        address?: string;
    };

    referrer?: string;
    referrerInfo?: {
        referrerCode: string;
        name: string;
        designation?: string;
        hospital?: string;
    };

    items: InvoiceItem[];

    grossAmount: number;
    waiverPercent: number;
    waiverAmount: number;
    netPayable: number;

    paidAmount: number;
    dueAmount: number;
    paymentStatus: PaymentStatus;

    commissionPercent?: number;
    commissionAmount?: number;
    commissionStatus?: 'pending' | 'paid';

    notes?: string;
    createdBy?: { _id: string; name: string; email: string } | string;
    isCancelled?: boolean;
    cancelReason?: string;
    createdAt: string;
};

export type CreateInvoiceInput = {
    patient: string;
    referrer?: string;
    testIds: string[];
    visitDate?: string;
    /** Omit to take the referrer's default. Admin-only override. */
    waiverPercent?: number;
    commissionPercent?: number;
    notes?: string;
    /** Take the whole net payable as cash immediately, issuing a receipt. */
    collectFullPayment?: boolean;
};

export type PatientHistory = {
    patient: Patient;
    invoices: Invoice[];
};

export const invoicesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getInvoices: builder.query<
            Paginated<Invoice>,
            (ListQuery & { paymentStatus?: PaymentStatus }) | void
        >({
            query: (params) => ({
                url: '/invoices',
                params: cleanParams({
                    page: 1,
                    limit: 20,
                    sortBy: '-visitDate',
                    ...(params ?? {}),
                    searchTerm: params?.search,
                    search: undefined,
                }),
            }),
            transformResponse: toPaginated<Invoice>,
            providesTags: (result) =>
                result
                    ? [
                          ...result.items.map(({ _id }) => ({
                              type: 'Invoices' as const,
                              id: _id,
                          })),
                          { type: 'Invoices' as const, id: 'LIST' },
                      ]
                    : [{ type: 'Invoices', id: 'LIST' }],
        }),

        getInvoice: builder.query<Invoice, string>({
            query: (id) => ({ url: `/invoices/${id}` }),
            transformResponse: (r: ApiResponse<Invoice>) => r.data,
            providesTags: (_r, _e, id) => [{ type: 'Invoices', id }],
        }),

        getPatientHistory: builder.query<PatientHistory, string>({
            query: (patientId) => ({ url: `/invoices/patient/${patientId}` }),
            transformResponse: (r: ApiResponse<PatientHistory>) => r.data,
            providesTags: (_r, _e, patientId) => [
                { type: 'Invoices', id: `PATIENT-${patientId}` },
            ],
        }),

        createInvoice: builder.mutation<Invoice, CreateInvoiceInput>({
            query: (body) => ({ url: '/invoices', method: 'POST', body }),
            transformResponse: (r: ApiResponse<Invoice>) => r.data,
            // Booking can issue a receipt too, so the payment list is stale.
            invalidatesTags: [
                { type: 'Invoices', id: 'LIST' },
                { type: 'Payments', id: 'LIST' },
                { type: 'Dashboard', id: 'ALL' },
            ],
        }),

        updateInvoiceItems: builder.mutation<
            Invoice,
            {
                id: string;
                testIds: string[];
                waiverPercent?: number;
                commissionPercent?: number;
            }
        >({
            query: ({ id, ...body }) => ({
                url: `/invoices/${id}/items`,
                method: 'PATCH',
                body,
            }),
            transformResponse: (r: ApiResponse<Invoice>) => r.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: 'Invoices', id },
                { type: 'Invoices', id: 'LIST' },
            ],
        }),

        cancelInvoice: builder.mutation<Invoice, { id: string; reason: string }>({
            query: ({ id, reason }) => ({
                url: `/invoices/${id}/cancel`,
                method: 'PATCH',
                body: { reason },
            }),
            transformResponse: (r: ApiResponse<Invoice>) => r.data,
            invalidatesTags: (_r, _e, { id }) => [
                { type: 'Invoices', id },
                { type: 'Invoices', id: 'LIST' },
                { type: 'Dashboard', id: 'ALL' },
            ],
        }),

        uploadReport: builder.mutation<
            Invoice,
            { invoiceId: string; itemId: string; file: File }
        >({
            query: ({ invoiceId, itemId, file }) => {
                const formData = new FormData();
                formData.append('report', file);
                return {
                    url: `/invoices/${invoiceId}/items/${itemId}/report`,
                    method: 'POST',
                    body: formData,
                };
            },
            transformResponse: (r: ApiResponse<Invoice>) => r.data,
            invalidatesTags: (_r, _e, { invoiceId }) => [
                { type: 'Invoices', id: invoiceId },
                { type: 'Invoices', id: 'LIST' },
                { type: 'Dashboard', id: 'ALL' },
            ],
        }),

        markReportDelivered: builder.mutation<
            Invoice,
            { invoiceId: string; itemId: string }
        >({
            query: ({ invoiceId, itemId }) => ({
                url: `/invoices/${invoiceId}/items/${itemId}/deliver`,
                method: 'PATCH',
            }),
            transformResponse: (r: ApiResponse<Invoice>) => r.data,
            invalidatesTags: (_r, _e, { invoiceId }) => [
                { type: 'Invoices', id: invoiceId },
                { type: 'Dashboard', id: 'ALL' },
            ],
        }),

        // Signed links are short-lived, so fetch on demand rather than caching.
        getReportLink: builder.mutation<
            { url: string; originalName: string },
            { invoiceId: string; itemId: string }
        >({
            query: ({ invoiceId, itemId }) => ({
                url: `/invoices/${invoiceId}/items/${itemId}/report`,
            }),
            transformResponse: (
                r: ApiResponse<{ url: string; originalName: string }>
            ) => r.data,
        }),
    }),
});

export const {
    useGetInvoicesQuery,
    useGetInvoiceQuery,
    useGetPatientHistoryQuery,
    useCreateInvoiceMutation,
    useUpdateInvoiceItemsMutation,
    useCancelInvoiceMutation,
    useUploadReportMutation,
    useMarkReportDeliveredMutation,
    useGetReportLinkMutation,
} = invoicesApi;
