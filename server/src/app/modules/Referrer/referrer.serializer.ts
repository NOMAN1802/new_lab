import { TReferrer } from './referrer.interface';

type TPlainReferrer = Record<string, unknown>;

const toPlain = (referrer: TReferrer): TPlainReferrer =>
  typeof (referrer as { toObject?: () => TPlainReferrer }).toObject ===
  'function'
    ? (referrer as unknown as { toObject: () => TPlainReferrer }).toObject()
    : ({ ...referrer } as TPlainReferrer);

// Receptionists manage referrers (add/edit/deactivate) with the same access
// as admin, so both roles see the full record including commercial terms.
export const serializeReferrer = (referrer: TReferrer): TPlainReferrer =>
  toPlain(referrer);

export const serializeReferrers = (referrers: TReferrer[]): TPlainReferrer[] =>
  referrers.map((referrer) => serializeReferrer(referrer));
