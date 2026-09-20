import { isSettled, percentOf, round2, sum } from '../../utils/money';
import {
  TCommissionType,
  TInvoiceItem,
  TPaymentStatus,
} from './invoice.interface';

export type TInvoiceTotals = {
  grossAmount: number;
  discountAmount: number;
  netPayable: number;
  commissionAmount: number;
  dueAmount: number;
  paymentStatus: TPaymentStatus;
};

/**
 * The single place invoice money is derived.
 *
 *   gross    = sum of test prices from the catalogue, plus any outdoor lines
 *   discount = catalogueGross x discountPercent   <- comes off what the PATIENT pays
 *   net      = gross - discount                   <- what the patient hands over
 *
 * An outdoor line (a one-off test billed at a manually typed price, with no
 * catalogue entry) is never discounted and never counted towards commission —
 * it is billed exactly as entered and settled outside the referrer arrangement.
 *
 * Commission is a separate arrangement between the centre and the referring
 * doctor. It does not touch the patient's bill, and the centre sets it per
 * invoice as either a percentage of the discounted catalogue amount, or a flat
 * taka figure.
 *
 *   commission = catalogueNet x value   (type 'percent')
 *              = value                  (type 'fixed')
 */
export const computeTotals = (
  items: Pick<TInvoiceItem, 'price' | 'isOutdoor'>[],
  discountPercent: number,
  commissionType: TCommissionType,
  commissionValue: number,
  paidAmount = 0
): TInvoiceTotals => {
  const catalogueItems = items.filter((item) => !item.isOutdoor);
  const outdoorItems = items.filter((item) => item.isOutdoor);

  const catalogueGross = sum(catalogueItems.map((item) => item.price));
  const outdoorGross = sum(outdoorItems.map((item) => item.price));

  const grossAmount = round2(catalogueGross + outdoorGross);
  const discountAmount = percentOf(catalogueGross, discountPercent);
  const catalogueNet = round2(catalogueGross - discountAmount);
  const netPayable = round2(catalogueNet + outdoorGross);

  const commissionAmount = computeCommission(
    catalogueNet,
    commissionType,
    commissionValue
  );

  const rawDue = round2(netPayable - paidAmount);
  const dueAmount = rawDue < 0 ? 0 : rawDue;

  return {
    grossAmount,
    discountAmount,
    netPayable,
    commissionAmount,
    dueAmount,
    paymentStatus: derivePaymentStatus(netPayable, paidAmount),
  };
};

/**
 * A flat commission is taken as entered. A percentage is applied to the net
 * payable — the figure the patient actually settles — not the gross, so a
 * discount reduces the commission alongside the bill.
 */
export const computeCommission = (
  netPayable: number,
  commissionType: TCommissionType,
  commissionValue: number
): number => {
  if (!commissionValue || commissionValue <= 0) return 0;

  return commissionType === 'fixed'
    ? round2(commissionValue)
    : percentOf(netPayable, commissionValue);
};

/**
 * Status is a function of the ledger, never a field a caller can set.
 * A zero-value invoice (fully discounted) counts as paid.
 */
export const derivePaymentStatus = (
  netPayable: number,
  paidAmount: number
): TPaymentStatus => {
  if (isSettled(netPayable) || isSettled(round2(netPayable - paidAmount))) {
    return 'paid';
  }
  return paidAmount > 0 ? 'partial' : 'unpaid';
};
