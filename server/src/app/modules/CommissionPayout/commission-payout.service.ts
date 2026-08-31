import httpStatus from 'http-status';
import mongoose, { Types } from 'mongoose';
import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { dateRangeFilter, resolveDateRange } from '../../utils/dateRange';
import { round2 } from '../../utils/money';
import { recordActivity } from '../ActivityLog/activity-log.service';
import { formatDocNumber, nextSequence } from '../Counter/counter.model';
import { Invoice } from '../Invoice/invoice.model';
import { Referrer } from '../Referrer/referrer.model';
import { TCommissionPayout } from './commission-payout.interface';
import { CommissionPayout } from './commission-payout.model';

export type TCreatePayoutInput = {
  referrer: string;
  invoiceIds?: string[];
  periodFrom?: string;
  periodTo?: string;
  paidOn?: string;
  note?: string;
};

/**
 * Commission accrues on cancelled invoices too if we are not careful — only
 * live invoices with a pending commission are ever settleable.
 */
const pendingCommissionFilter = (referrerId: string) => ({
  referrer: new Types.ObjectId(referrerId),
  commissionStatus: 'pending' as const,
  isCancelled: { $ne: true },
  commissionAmount: { $gt: 0 },
});

const createPayout = async (
  payload: TCreatePayoutInput,
  userId: string
): Promise<TCommissionPayout> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const referrer = await Referrer.findById(payload.referrer).session(session);
    if (!referrer) {
      throw new AppError(httpStatus.NOT_FOUND, 'Referrer not found');
    }

    const filter: Record<string, unknown> = pendingCommissionFilter(
      payload.referrer
    );

    if (payload.invoiceIds?.length) {
      filter._id = {
        $in: payload.invoiceIds.map((id) => new Types.ObjectId(id)),
      };
    } else if (payload.periodFrom || payload.periodTo) {
      const bounds: Record<string, Date> = {};
      if (payload.periodFrom) bounds.$gte = new Date(payload.periodFrom);
      if (payload.periodTo) bounds.$lte = new Date(payload.periodTo);
      filter.visitDate = bounds;
    }

    const invoices = await Invoice.find(filter).session(session);

    if (invoices.length === 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No pending commission found for this referrer'
      );
    }

    if (payload.invoiceIds?.length && invoices.length !== payload.invoiceIds.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Some selected invoices are cancelled, already settled, or belong to another referrer'
      );
    }

    const amount = round2(
      invoices.reduce((total, invoice) => total + invoice.commissionAmount, 0)
    );

    const seq = await nextSequence('commission-payout', session);

    const [payout] = await CommissionPayout.create(
      [
        {
          payoutNumber: formatDocNumber('CPO', seq),
          referrer: referrer._id,
          referrerName: referrer.name,
          referrerCode: referrer.referrerCode,
          invoices: invoices.map((invoice) => invoice._id),
          invoiceCount: invoices.length,
          periodFrom: payload.periodFrom
            ? new Date(payload.periodFrom)
            : undefined,
          periodTo: payload.periodTo ? new Date(payload.periodTo) : undefined,
          amount,
          paidOn: payload.paidOn ? new Date(payload.paidOn) : new Date(),
          paidBy: new Types.ObjectId(userId),
          note: payload.note,
        },
      ],
      { session }
    );

    await Invoice.updateMany(
      { _id: { $in: invoices.map((invoice) => invoice._id) } },
      { commissionStatus: 'paid', commissionPayout: payout._id },
      { session }
    );

    await session.commitTransaction();

    await recordActivity({
      userId,
      action: 'commission.paid_out',
      entity: 'CommissionPayout',
      entityId: payout._id,
      entityLabel: payout.payoutNumber,
      summary: `Paid ${amount} commission to ${referrer.name} covering ${invoices.length} invoice(s)`,
      meta: {
        amount,
        referrer: referrer.name,
        invoiceCount: invoices.length,
      },
    });

    return payout;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

const getPayouts = async (query: Record<string, unknown>) => {
  const range = resolveDateRange(query);

  const baseQuery = CommissionPayout.find({
    ...dateRangeFilter('paidOn', range),
  }).populate('paidBy', 'name email');

  const payoutQuery = new QueryBuilder(baseQuery, query)
    .search(['payoutNumber', 'referrerName', 'referrerCode'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [payouts, total] = await Promise.all([
    payoutQuery.modelQuery,
    payoutQuery.countTotal(),
  ]);

  return {
    meta: {
      total,
      page: Number(query.page ?? 1),
      limit: Number(query.limit ?? 10),
    },
    result: payouts,
  };
};

const getPayout = async (id: string): Promise<TCommissionPayout> => {
  const payout = await CommissionPayout.findById(id)
    .populate('paidBy', 'name email')
    .populate('invoices', 'invoiceNumber visitDate netPayable commissionAmount');

  if (!payout) throw new AppError(httpStatus.NOT_FOUND, 'Payout not found');
  return payout;
};

/** What is still owed to a referrer, and which invoices make it up. */
const getPendingCommission = async (referrerId: string) => {
  const referrer = await Referrer.findById(referrerId);
  if (!referrer) throw new AppError(httpStatus.NOT_FOUND, 'Referrer not found');

  const invoices = await Invoice.find(pendingCommissionFilter(referrerId))
    .select('invoiceNumber visitDate netPayable commissionPercent commissionAmount')
    .sort({ visitDate: 1 });

  const totalPending = round2(
    invoices.reduce((total, invoice) => total + invoice.commissionAmount, 0)
  );

  return { referrer, invoices, totalPending };
};

export const CommissionPayoutServices = {
  createPayout,
  getPayouts,
  getPayout,
  getPendingCommission,
};
