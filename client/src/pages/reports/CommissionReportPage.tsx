import { useState } from 'react';
import DateRangePicker from '@/components/common/DateRangePicker';
import { rangeForDays } from '@/lib/dateRange';
import ErrorState from '@/components/common/ErrorState';
import ExportButtons from '@/components/common/ExportButtons';
import Loader from '@/components/common/Loader';
import StatCard from '@/components/common/StatCard';
import { money } from '@/lib/format';
import { useGetReferralCommissionReportQuery } from '@/services/reportsApi';
import type { ReferralCommissionRow } from '@/services/reportsApi';

const COLUMNS = [
    { header: 'Code', accessor: (r: ReferralCommissionRow) => r.referrerCode },
    { header: 'Referrer', accessor: (r: ReferralCommissionRow) => r.referrerName },
    { header: 'Hospital', accessor: (r: ReferralCommissionRow) => r.hospital ?? '' },
    { header: 'Invoices', accessor: (r: ReferralCommissionRow) => r.invoiceCount },
    { header: 'Gross billed', accessor: (r: ReferralCommissionRow) => r.grossBilled },
    { header: 'Discount given', accessor: (r: ReferralCommissionRow) => r.discountGiven },
    { header: 'Net billed', accessor: (r: ReferralCommissionRow) => r.netBilled },
    { header: 'Commission accrued', accessor: (r: ReferralCommissionRow) => r.commissionAccrued },
    { header: 'Commission paid', accessor: (r: ReferralCommissionRow) => r.commissionPaid },
    { header: 'Commission pending', accessor: (r: ReferralCommissionRow) => r.commissionPending },
];

const CommissionReportPage = () => {
    const [range, setRange] = useState(rangeForDays(29));
    const { data, isLoading, isError, refetch } =
        useGetReferralCommissionReportQuery(range);

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Referral &amp; commission
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Discounts given and commission accrued, paid and pending by referrer.
                    </p>
                </div>
                <ExportButtons
                    title="Referral commission"
                    subtitle={`${range.startDate} to ${range.endDate}`}
                    filename={`commission-${range.startDate}-to-${range.endDate}`}
                    columns={COLUMNS}
                    rows={data?.rows ?? []}
                />
            </header>

            <DateRangePicker value={range} onChange={setRange} />

            {isLoading ? (
                <Loader message="Building commission report..." />
            ) : isError || !data ? (
                <ErrorState title="Could not load the commission report" onRetry={refetch} />
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard label="Referrers" value={data.summary.referrers} />
                        <StatCard label="Discounts given" value={money(data.summary.discountGiven)} />
                        <StatCard
                            label="Commission accrued"
                            value={money(data.summary.commissionAccrued)}
                        />
                        <StatCard
                            label="Commission pending"
                            value={money(data.summary.commissionPending)}
                            accent="bg-amber-100 text-amber-600"
                        />
                    </div>

                    {data.rows.length === 0 ? (
                        <div className="rounded-sm border border-dashed border-slate-200 bg-white/70 p-12 text-center">
                            <p className="text-sm font-medium text-slate-500">
                                No referred bookings in this date range.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-sm border border-white/60 bg-white/80 shadow-card shadow-slate-200/40 backdrop-blur">
                            <table className="w-full min-w-[60rem] text-left text-sm">
                                <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-4 font-semibold">Referrer</th>
                                        <th className="px-5 py-4 text-right font-semibold">Invoices</th>
                                        <th className="px-5 py-4 text-right font-semibold">Gross</th>
                                        <th className="px-5 py-4 text-right font-semibold">Discount</th>
                                        <th className="px-5 py-4 text-right font-semibold">Net</th>
                                        <th className="px-5 py-4 text-right font-semibold">Accrued</th>
                                        <th className="px-5 py-4 text-right font-semibold">Paid</th>
                                        <th className="px-5 py-4 text-right font-semibold">Pending</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.rows.map((row) => (
                                        <tr key={row._id} className="hover:bg-slate-50/70">
                                            <td className="px-5 py-4">
                                                <p className="font-medium text-slate-900">
                                                    {row.referrerName}
                                                </p>
                                                <p className="font-mono text-xs text-slate-500">
                                                    {row.referrerCode}
                                                    {row.hospital ? ` · ${row.hospital}` : ''}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4 text-right tabular-nums text-slate-600">
                                                {row.invoiceCount}
                                            </td>
                                            <td className="px-5 py-4 text-right tabular-nums text-slate-600">
                                                {money(row.grossBilled)}
                                            </td>
                                            <td className="px-5 py-4 text-right tabular-nums text-amber-600">
                                                {money(row.discountGiven)}
                                            </td>
                                            <td className="px-5 py-4 text-right tabular-nums text-slate-900">
                                                {money(row.netBilled)}
                                            </td>
                                            <td className="px-5 py-4 text-right tabular-nums text-slate-900">
                                                {money(row.commissionAccrued)}
                                            </td>
                                            <td className="px-5 py-4 text-right tabular-nums text-emerald-600">
                                                {money(row.commissionPaid)}
                                            </td>
                                            <td className="px-5 py-4 text-right font-semibold tabular-nums text-rose-500">
                                                {money(row.commissionPending)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CommissionReportPage;
