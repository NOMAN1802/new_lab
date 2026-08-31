/**
 * The centre operates in Bangladesh (UTC+6, no DST). Every "today", "this
 * week" and daily-collection figure must be bounded on Dhaka calendar days —
 * grouping on raw UTC would file every booking taken before 06:00 local time
 * into the previous day's cash report.
 */
export const CENTRE_TIMEZONE = 'Asia/Dhaka';

/** Fixed +06:00 offset in minutes. Bangladesh has observed no DST since 2010. */
const OFFSET_MINUTES = 6 * 60;
const MS_PER_MINUTE = 60_000;

/** Start of the given Dhaka calendar day, as a UTC instant. */
export const startOfDhakaDay = (date: Date): Date => {
  const shifted = new Date(date.getTime() + OFFSET_MINUTES * MS_PER_MINUTE);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - OFFSET_MINUTES * MS_PER_MINUTE);
};

/** Exclusive end of the given Dhaka calendar day, as a UTC instant. */
export const endOfDhakaDay = (date: Date): Date => {
  const start = startOfDhakaDay(date);
  return new Date(start.getTime() + 24 * 60 * MS_PER_MINUTE);
};

/** Parses a YYYY-MM-DD string as a Dhaka calendar day. */
export const parseDhakaDate = (value: string): Date =>
  new Date(`${value}T00:00:00+06:00`);

/** Two-digit day, month and year for the Dhaka calendar day of `date`. */
export const dhakaDateParts = (
  date: Date = new Date()
): { dd: string; mm: string; yy: string; yyyy: string } => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CENTRE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const yyyy = get('year');
  return { dd: get('day'), mm: get('month'), yy: yyyy.slice(-2), yyyy };
};

export type TDateRange = { start?: Date; end?: Date };

/**
 * Builds a half-open [start, end) range from query params. `date` selects a
 * single Dhaka day; `startDate`/`endDate` select an inclusive span of days.
 */
export const resolveDateRange = (query: {
  date?: unknown;
  startDate?: unknown;
  endDate?: unknown;
}): TDateRange => {
  if (typeof query.date === 'string' && query.date) {
    const day = parseDhakaDate(query.date);
    return { start: startOfDhakaDay(day), end: endOfDhakaDay(day) };
  }

  const range: TDateRange = {};

  if (typeof query.startDate === 'string' && query.startDate) {
    range.start = startOfDhakaDay(parseDhakaDate(query.startDate));
  }
  if (typeof query.endDate === 'string' && query.endDate) {
    // Inclusive of the whole end day.
    range.end = endOfDhakaDay(parseDhakaDate(query.endDate));
  }

  return range;
};

/** Mongo filter fragment for a date field, or `{}` when unbounded. */
export const dateRangeFilter = (
  field: string,
  range: TDateRange
): Record<string, unknown> => {
  if (!range.start && !range.end) return {};

  const bounds: Record<string, Date> = {};
  if (range.start) bounds.$gte = range.start;
  if (range.end) bounds.$lt = range.end;

  return { [field]: bounds };
};

/**
 * `$dateToString` format strings for grouping, all Dhaka-local.
 * Used by the dashboard and revenue reports.
 */
export const GROUP_FORMATS = {
  daily: '%Y-%m-%d',
  monthly: '%Y-%m',
  yearly: '%Y',
} as const;

export type TGroupBy = keyof typeof GROUP_FORMATS;

export const groupByExpression = (groupBy: TGroupBy, field: string) => ({
  $dateToString: {
    format: GROUP_FORMATS[groupBy],
    date: `$${field}`,
    timezone: CENTRE_TIMEZONE,
  },
});
