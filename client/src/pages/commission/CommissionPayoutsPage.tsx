import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import { apiErrorMessage, commissionBasis, formatDate, money } from '@/lib/format';
import {
    useCreateCommissionPayoutMutation,
    useGetCommissionPayoutsQuery,
    useGetPendingCommissionQuery,
} from '@/services/commissionPayoutsApi';
import { useGetReferrersQuery } from '@/services/referrersApi';

const CommissionPayoutsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const referrerId = searchParams.get('referrer') ?? '';
    const [note, setNote] = useState('');

    const { data: referrerData } = useGetReferrersQuery({ limit: 200 });
    const { data: payoutData, isLoading, isError, refetch } =
        useGetCommissionPayoutsQuery();
    const { data: pending, isFetching: loadingPending } = useGetPendingCommissionQuery(
        referrerId,
        { skip: !referrerId }
    );

    const [createPayout, { isLoading: isPaying }] = useCreateCommissionPayoutMutation();

    const referrers = referrerData?.items ?? [];
    const payouts = payoutData?.items ?? [];

    const handlePayout = async () => {
        if (!pending || pending.invoices.length === 0) return;

        if (
            !window.confirm(
                `Record a payout of ${money(pending.totalPending)} to ${pending.referrer.name} covering ${pending.invoices.length} invoice(s)?`
            )
        ) {
            return;
        }

        try {
            const payout = await createPayout({
                referrer: referrerId,
                invoiceIds: pending.invoices.map((invoice) => invoice._id),
                note: note.trim() || undefined,
            }).unwrap();

            toast.success(`Payout ${payout.payoutNumber} recorded`);
            setNote('');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not record the payout'));
        }
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-semibold text-slate-900">Commission payouts</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Settle accrued commission. Recording a payout marks the covered invoices
                    as paid.
                </p>
            </header>

            <section className="space-y-4 rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                <h2 className="text-lg font-semibold text-slate-900">Settle a referrer</h2>

                <select
                    value={referrerId}
                    onChange={(e) => {
                        const next = e.target.value;
                        setSearchParams(next ? { referrer: next } : {});
                    }}
                    className="w-full max-w-md rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                    <option value="">Select a referrer</option>
                    {referrers.map((referrer) => (
                        <option key={referrer._id} value={referrer._id}>
                            {referrer.referrerCode} · {referrer.name}
                        </option>
                    ))}
                </select>

                {referrerId && loadingPending && <Loader message="Loading pending commission..." />}

                {referrerId && pending && !loadingPending && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm bg-amber-50/70 px-5 py-4">
                            <div>
                                <p className="text-sm text-slate-600">
                                    Pending for{' '}
                                    <strong className="text-slate-900">{pending.referrer.name}</strong>
                                </p>
                                <p className="text-xs text-slate-500">
                                    {pending.invoices.length} unsettled invoice(s)
                                </p>
                            </div>
                            <p className="text-2xl font-semibold tabular-nums text-slate-900">
                                {money(pending.totalPending)}
                            </p>
                        </div>

                        {pending.invoices.length === 0 ? (
                            <p className="rounded-sm border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                                Nothing outstanding for this referrer.
                            </p>
                        ) : (
                            <>
                                <div className="overflow-x-auto rounded-sm border border-slate-100">
                                    <table className="w-full min-w-[34rem] text-left text-sm">
                                        <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold">Invoice</th>
                                                <th className="px-4 py-3 font-semibold">Date</th>
                                                <th className="px-4 py-3 text-right font-semibold">Net</th>
                                                <th className="px-4 py-3 text-right font-semibold">Rate</th>
                                                <th className="px-4 py-3 text-right font-semibold">
                                                    Commission
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {pending.invoices.map((invoice) => (
                                                <tr key={invoice._id}>
                                                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand">
                                                        {invoice.invoiceNumber}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500">
                                                        {formatDate(invoice.visitDate)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                                                        {money(invoice.netPayable)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                                                        {commissionBasis(invoice.commissionType, invoice.commissionValue)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                                                        {money(invoice.commissionAmount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="min-w-[16rem] flex-1">
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                            Note <span className="text-slate-400">(optional)</span>
                                        </label>
                                        <input
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder="Paid in cash on..."
                                            className="w-full rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handlePayout}
                                        disabled={isPaying}
                                        className="rounded-sm bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 disabled:opacity-60"
                                    >
                                        {isPaying
                                            ? 'Recording...'
                                            : `Record payout of ${money(pending.totalPending)}`}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">Payout history</h2>

                {isLoading ? (
                    <Loader message="Loading payouts..." />
                ) : isError ? (
                    <ErrorState title="Could not load payouts" onRetry={refetch} />
                ) : payouts.length === 0 ? (
                    <div className="rounded-sm border border-dashed border-slate-200 bg-white/70 p-12 text-center">
                        <p className="text-sm font-medium text-slate-500">
                            No commission has been paid out yet.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-sm border border-white/60 bg-white/80 shadow-card shadow-slate-200/40 backdrop-blur">
                        <table className="w-full min-w-[42rem] text-left text-sm">
                            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-4 font-semibold">Payout</th>
                                    <th className="px-5 py-4 font-semibold">Referrer</th>
                                    <th className="px-5 py-4 font-semibold">Paid on</th>
                                    <th className="px-5 py-4 text-right font-semibold">Invoices</th>
                                    <th className="px-5 py-4 text-right font-semibold">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payouts.map((payout) => (
                                    <tr key={payout._id} className="hover:bg-slate-50/70">
                                        <td className="px-5 py-4 font-mono text-xs font-semibold text-brand">
                                            {payout.payoutNumber}
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="font-medium text-slate-900">
                                                {payout.referrerName}
                                            </p>
                                            <p className="font-mono text-xs text-slate-500">
                                                {payout.referrerCode}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4 text-slate-500">
                                            {formatDate(payout.paidOn)}
                                        </td>
                                        <td className="px-5 py-4 text-right tabular-nums text-slate-600">
                                            {payout.invoiceCount}
                                        </td>
                                        <td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-900">
                                            {money(payout.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default CommissionPayoutsPage;
