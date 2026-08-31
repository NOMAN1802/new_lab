import { useState } from 'react';
import { Link } from 'react-router-dom';
import DateRangePicker from '@/components/common/DateRangePicker';
import { rangeForDays } from '@/lib/dateRange';
import ErrorState from '@/components/common/ErrorState';
import ExportButtons from '@/components/common/ExportButtons';
import Loader from '@/components/common/Loader';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDate, money } from '@/lib/format';
import { useGetDuesReportQuery } from '@/services/reportsApi';
import type { DuesReportRow } from '@/services/reportsApi';

const COLUMNS = [
    { header: 'Invoice', accessor: (r: DuesReportRow) => r.invoiceNumber },
    { header: 'Date', accessor: (r: DuesReportRow) => formatDate(r.visitDate) },
    { header: 'Patient ID', accessor: (r: DuesReportRow) => r.patientInfo.patientId },
    { header: 'Patient', accessor: (r: DuesReportRow) => r.patientInfo.name },
    { header: 'Phone', accessor: (r: DuesReportRow) => r.patientInfo.phone },
    { header: 'Referrer', accessor: (r: DuesReportRow) => r.referrerInfo?.name ?? 'Walk-in' },
    { header: 'Net payable', accessor: (r: DuesReportRow) => r.netPayable },
    { header: 'Paid', accessor: (r: DuesReportRow) => r.paidAmount },
    { header: 'Due', accessor: (r: DuesReportRow) => r.dueAmount },
];

const DuesReportPage = () => {
    const [range, setRange] = useState(rangeForDays(89));
    const { data, isLoading, isError, refetch } = useGetDuesReportQuery(range);

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Outstanding payments
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Every invoice still carrying a balance, largest first.
                    </p>
                </div>
                <ExportButtons
                    title="Outstanding payments"
                    subtitle={`${range.startDate} to ${range.endDate}`}
                    filename={`dues-${range.startDate}-to-${range.endDate}`}
                    columns={COLUMNS}
                    rows={data?.rows ?? []}
                />
            </header>

            <DateRangePicker value={range} onChange={setRange} />

            {isLoading ? (
                <Loader message="Building dues report..." />
            ) : isError || !data ? (
                <ErrorState title="Could not load the dues report" onRetry={refetch} />
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <StatCard
                            label="Total outstanding"
                            value={money(data.summary.totalDue)}
                            accent="bg-rose-100 text-rose-600"
                        />
                        <StatCard label="Invoices with a balance" value={data.summary.invoiceCount} />
                    </div>

                    {data.rows.length === 0 ? (
                        <div className="rounded-sm border border-dashed border-slate-200 bg-white/70 p-12 text-center">
                            <p className="text-sm font-medium text-slate-500">
                                Nothing outstanding in this date range.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-sm border border-white/60 bg-white/80 shadow-card shadow-slate-200/40 backdrop-blur">
                            <table className="w-full min-w-[54rem] text-left text-sm">
                                <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-4 font-semibold">Invoice</th>
                                        <th className="px-5 py-4 font-semibold">Date</th>
                                        <th className="px-5 py-4 font-semibold">Patient</th>
                                        <th className="px-5 py-4 font-semibold">Referrer</th>
                                        <th className="px-5 py-4 text-right font-semibold">Payable</th>
                                        <th className="px-5 py-4 text-right font-semibold">Paid</th>
                                        <th className="px-5 py-4 text-right font-semibold">Due</th>
                                        <th className="px-5 py-4 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.rows.map((row) => (
                                        <tr key={row._id} className="hover:bg-slate-50/70">
                                            <td className="px-5 py-4">
                                                <Link
                                                    to={`/billing/${row._id}`}
                                                    className="font-mono text-xs font-semibold text-brand transition hover:text-brand-dark"
                                                >
                                                    {row.invoiceNumber}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4 text-slate-500">
                                                {formatDate(row.visitDate)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="font-medium text-slate-900">
                                                    {row.patientInfo.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {row.patientInfo.patientId} · {row.patientInfo.phone}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4 text-slate-600">
                                                {row.referrerInfo?.name ?? (
                                                    <span className="text-slate-400">Walk-in</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right tabular-nums text-slate-900">
                                                {money(row.netPayable)}
                                            </td>
                                            <td className="px-5 py-4 text-right tabular-nums text-emerald-600">
                                                {money(row.paidAmount)}
                                            </td>
                                            <td className="px-5 py-4 text-right font-semibold tabular-nums text-rose-500">
                                                {money(row.dueAmount)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={row.paymentStatus} />
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

export default DuesReportPage;
