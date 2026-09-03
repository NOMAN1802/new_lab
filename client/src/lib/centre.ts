/**
 * Centre identity used on printed invoices and receipts.
 * Override per-deployment via Vite env vars without touching the code.
 */
export const CENTRE = {
    name:
        import.meta.env.VITE_CENTRE_NAME ||
        'New Lab Diagnostic & Consultation Centre',
    address: import.meta.env.VITE_CENTRE_ADDRESS || '',
    phone: import.meta.env.VITE_CENTRE_PHONE || '',
    email: import.meta.env.VITE_CENTRE_EMAIL || '',
    /** Staff handbook the sidebar help card links to. Blank hides the link. */
    handbookUrl: import.meta.env.VITE_HANDBOOK_URL || '',
} as const;
