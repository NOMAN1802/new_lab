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
 *   labGross     = sum of catalogue test prices
 *   discount     = labGross x discountPercent   <- comes off what the PATIENT pays
 *   outdoorGross = sum of outdoor test prices    <- billed exactly as entered
 *   gross        = labGross + outdoorGross
 *   net          = (labGross - discount) + outdoorGross
 *
 * An outdoor test — an ad-hoc test outside the catalogue, entered at booking
 * time — carries no discount and, because commission is computed on the lab
 * net below rather than the overall net, no referrer commission either.
 *
 * Commission is a separate arrangement between the centre and the referring
 * doctor. It does not touch the patient's bill, and the centre sets it per
 * invoice as either a percentage of the lab net the patient pays for
 * catalogue tests, or a flat taka figure.
 *
 *   commission = labNet x value   (type 'percent')
 *              = value            (type 'fixed')
 */
export const computeTotals = (
  items: Pick<TInvoiceItem, 'price' | 'isOutdoor'>[],
  discountPercent: number,
  commissionType: TCommissionType,
  commissionValue: number,
  paidAmount = 0
): TInvoiceTotals => {
  const labGross = sum(items.filter((item) => !item.isOutdoor).map((item) => item.price));
  const outdoorGross = sum(items.filter((item) => item.isOutdoor).map((item) => item.price));

  const grossAmount = round2(labGross + outdoorGross);
  const discountAmount = percentOf(labGross, discountPercent);
  const labNet = round2(labGross - discountAmount);
  const netPayable = round2(labNet + outdoorGross);

  const commissionAmount = computeCommission(
    labNet,
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
