import { useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import DateRangePicker from '@/components/common/DateRangePicker';
import { rangeForDays } from '@/lib/dateRange';
import ErrorState from '@/components/common/ErrorState';
import ExportButtons from '@/components/common/ExportButtons';
import Loader from '@/components/common/Loader';
import StatCard from '@/components/common/StatCard';
import { money } from '@/lib/format';
import {
    useGetCollectionByUserReportQuery,
    useGetFinancialSummaryQuery,
    useGetRevenueReportQuery,
} from '@/services/reportsApi';

type GroupBy = 'daily' | 'monthly' | 'yearly';

const GROUPS: GroupBy[] = ['daily', 'monthly', 'yearly'];

const FinancialReportPage = () => {
    const [range, setRange] = useState(rangeForDays(29));
    const [groupBy, setGroupBy] = useState<GroupBy>('daily');

    const summaryQuery = useGetFinancialSummaryQuery(range);
    const revenueQuery = useGetRevenueReportQuery({ ...range, groupBy });
    const collectionQuery = useGetCollectionByUserReportQuery(range);

    const isLoading =
        summaryQuery.isLoading || revenueQuery.isLoading || collectionQuery.isLoading;
    const isError = summaryQuery.isError || revenueQuery.isError;

    const summary = summaryQuery.data;
    const series = revenueQuery.data?.series ?? [];
    const collections = collectionQuery.data?.rows ?? [];

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Financial summary</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Billed and collected are separate: an invoice raised today may be
                        collected next week.
                    </p>
                </div>
                <ExportButtons
                    title="Revenue"
                    subtitle={`${range.startDate} to ${range.endDate}`}
                    filename={`revenue-${range.startDate}-to-${range.endDate}`}
                    columns={[
                        { header: 'Period', accessor: (row: { _id: string }) => row._id },
                        {
                            header: 'Collected (BDT)',
                            accessor: (row: { collected: number }) => row.collected,
                        },
                        {
                            header: 'Receipts',
                            accessor: (row: { receipts: number }) => row.receipts,
                        },
                    ]}
                    rows={series}
                />
            </header>

            <div className="flex flex-wrap items-center gap-3">
                <DateRangePicker value={range} onChange={setRange} />
                <div className="flex gap-1 rounded-sm bg-slate-100 p-1">
                    {GROUPS.map((group) => (
                        <button
                            key={group}
                            type="button"
                            onClick={() => setGroupBy(group)}
                            className={`rounded-sm px-4 py-1.5 text-xs font-semibold capitalize transition ${
                                groupBy === group
                                    ? 'bg-white text-brand shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {group}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <Loader message="Building financial summary..." />
            ) : isError || !summary ? (
                <ErrorState
                    title="Could not load the financial summary"
                    onRetry={() => {
                        summaryQuery.refetch();
                        revenueQuery.refetch();
                    }}
                />
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard label="Cash collected" value={money(summary.cashCollected)} />
                        <StatCard label="Net billed" value={money(summary.netBilled)} />
                        <StatCard label="Outstanding" value={money(summary.outstanding)} />
                        <StatCard label="Invoices" value={summary.invoiceCount} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard label="Gross billed" value={money(summary.grossBilled)} />
                        <StatCard
                            label="Discounts given"
                            value={money(summary.discountGiven)}
                            trend={{
                                value: summary.discountRate,
                                isPositive: false,
                                label: 'of gross',
                            }}
                        />
                        <StatCard
                            label="Commission accrued"
                            value={money(summary.commissionAccrued)}
                        />
                        <StatCard
                            label="Net after commission"
                            value={money(summary.netAfterCommission)}
                            trend={{
                                value: summary.collectionRate,
                                isPositive: true,
                                label: 'collection rate',
                            }}
                        />
                    </div>

                    <section className="rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                        <h2 className="mb-4 text-lg font-semibold text-slate-900">
                            Cash collected, {groupBy}
                        </h2>
                        {series.length === 0 ? (
                            <p className="py-12 text-center text-sm text-slate-500">
                                No payments in this period.
                            </p>
                        ) : (
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={series}
                                        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#e2e8f0"
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="_id"
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            tickLine={false}
                                            axisLine={false}
                                            width={70}
                                            tickFormatter={(value) =>
                                                `৳${Number(value).toLocaleString()}`
                                            }
                                        />
                                        <Tooltip
                                            formatter={(value: number) => [money(value), 'Collected']}
                                            contentStyle={{
                                                borderRadius: '0.75rem',
                                                border: '1px solid #e2e8f0',
                                                fontSize: '0.8rem',
                                            }}
                                        />
                                        <Bar
                                            dataKey="collected"
                                            fill="#2563eb"
                                            radius={[6, 6, 0, 0]}
                                            maxBarSize={44}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </section>

                    <section className="rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                        <h2 className="mb-4 text-lg font-semibold text-slate-900">
                            Collection by receptionist
                        </h2>
                        {collections.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-500">
                                No cash collected in this period.
                            </p>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="py-2 font-semibold">Staff</th>
                                        <th className="py-2 text-right font-semibold">Receipts</th>
                                        <th className="py-2 text-right font-semibold">Collected</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {collections.map((row) => (
                                        <tr key={row._id}>
                                            <td className="py-2.5 text-slate-800">{row.name}</td>
                                            <td className="py-2.5 text-right tabular-nums text-slate-600">
                                                {row.receipts}
                                            </td>
                                            <td className="py-2.5 text-right tabular-nums text-emerald-600">
                                                {money(row.collected)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>
                </>
            )}
        </div>
    );
};

export default FinancialReportPage;
