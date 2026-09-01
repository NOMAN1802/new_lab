const BDT = new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** Money for display. Returns a dash for values the API withheld by role. */
export const money = (value?: number | null): string =>
    value === undefined || value === null ? '—' : `৳${BDT.format(value)}`;

export const percent = (value?: number | null): string =>
    value === undefined || value === null ? '—' : `${value}%`;

/**
 * How a commission was arrived at, e.g. "15% of paid" or "flat ৳500".
 * The value means a percentage or a taka figure depending on the type.
 */
export const commissionBasis = (
    type?: 'percent' | 'fixed' | null,
    value?: number | null
): string => {
    if (value === undefined || value === null) return '—';
    return type === 'fixed' ? `flat ${money(value)}` : `${value}% of paid`;
};

const DHAKA = 'Asia/Dhaka';

export const formatDate = (value?: string | Date | null): string =>
    value
        ? new Date(value).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              timeZone: DHAKA,
          })
        : '—';

export const formatDateTime = (value?: string | Date | null): string =>
    value
        ? new Date(value).toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: DHAKA,
          })
        : '—';

/** YYYY-MM-DD in Dhaka time, for date inputs and API range params. */
export const toDhakaDateInput = (value: Date = new Date()): string => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: DHAKA,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(value);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
};

/** Pulls a readable message out of an RTK Query error. */
export const apiErrorMessage = (
    error: unknown,
    fallback = 'Something went wrong'
): string => {
    const data = (error as { data?: { message?: string } })?.data;
    return data?.message || fallback;
};
