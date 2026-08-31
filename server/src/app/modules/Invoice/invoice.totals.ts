import { isSettled, percentOf, round2, sum } from '../../utils/money';
import { TInvoiceItem, TPaymentStatus } from './invoice.interface';

export type TInvoiceTotals = {
  grossAmount: number;
  waiverAmount: number;
  netPayable: number;
  commissionAmount: number;
  dueAmount: number;
  paymentStatus: TPaymentStatus;
};

/**
 * The single place invoice money is derived.
 *
 * gross      = sum of item prices
 * waiver     = gross x waiverPercent
 * net        = gross - waiver            <- what the patient owes
 * commission = net x commissionPercent   <- referrer earns on net, not gross
 * due        = net - paid
 *
 * Nothing here is ever taken from the request body: prices come from the Test
 * catalogue and paidAmount from the Payment ledger.
 */
export const computeTotals = (
  items: Pick<TInvoiceItem, 'price'>[],
  waiverPercent: number,
  commissionPercent: number,
  paidAmount = 0
): TInvoiceTotals => {
  const grossAmount = sum(items.map((item) => item.price));
  const waiverAmount = percentOf(grossAmount, waiverPercent);
  const netPayable = round2(grossAmount - waiverAmount);
  const commissionAmount = percentOf(netPayable, commissionPercent);

  const rawDue = round2(netPayable - paidAmount);
  const dueAmount = rawDue < 0 ? 0 : rawDue;

  return {
    grossAmount,
    waiverAmount,
    netPayable,
    commissionAmount,
    dueAmount,
    paymentStatus: derivePaymentStatus(netPayable, paidAmount),
  };
};

/**
 * Status is a function of the ledger, never a field a caller can set.
 * A zero-value invoice (fully waived) counts as paid.
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
