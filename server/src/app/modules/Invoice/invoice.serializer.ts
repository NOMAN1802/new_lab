import { TUserRole } from '../User/user.interface';
import { TInvoice } from './invoice.interface';

type TPlain = Record<string, unknown>;

const toPlain = (doc: unknown): TPlain =>
  typeof (doc as { toObject?: () => TPlain })?.toObject === 'function'
    ? (doc as { toObject: () => TPlain }).toObject()
    : { ...(doc as TPlain) };

/**
 * Per-invoice figures are returned in full to both roles.
 *
 * The centre prints the commission line on the invoice itself, and a
 * receptionist is the one printing it, so nothing on an individual invoice is
 * withheld from them — gross, waiver, net and commission all come through.
 *
 * The §4.2 restriction is enforced where it still applies: a receptionist gets
 * no aggregate revenue, waiver or commission figures. Their dashboard payload
 * carries none, and every financial report and the commission-payout module
 * are admin-only at the route layer.
 *
 * The one thing still stripped is the referrer's *standing* rate card, which
 * is a commercial term across all their patients rather than a figure on this
 * invoice.
 */
export const serializeInvoice = (invoice: TInvoice, role: TUserRole): TPlain => {
  const plain = toPlain(invoice);
  if (role === 'admin') return plain;

  const referrer = plain.referrer as TPlain | undefined;
  if (referrer && typeof referrer === 'object') {
    delete referrer.defaultWaiverPercent;
    delete referrer.defaultCommissionPercent;
  }

  return plain;
};

export const serializeInvoices = (
  invoices: TInvoice[],
  role: TUserRole
): TPlain[] => invoices.map((invoice) => serializeInvoice(invoice, role));
