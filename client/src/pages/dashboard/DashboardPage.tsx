import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    BanknotesIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    ExclamationTriangleIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import { useAppSelector } from '@/hooks/store';
import { formatDate, formatDateTime, money, toDhakaDateInput } from '@/lib/format';
import { isAdminDashboard, useGetDashboardQuery } from '@/services/dashboardApi';

const daysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return toDhakaDateInput(date);
};

const RANGES = [
    { label: '7 days', days: 6 },
    { label: '30 days', days: 29 },
    { label: '90 days', days: 89 },
];

const DashboardPage = () => {
    const user = useAppSelector((state) => state.auth.user);
    const [rangeDays, setRangeDays] = useState(29);

    const { data, isLoading, isError, refetch } = useGetDashboardQuery({
        startDate: daysAgo(rangeDays),
        endDate: toDhakaDateInput(),
        groupBy: 'daily',
    });

    if (isLoading) return <Loader message="Loading dashboard..." />;
    if (isError || !data) {
        return <ErrorState title="Could not load the dashboard" onRetry={refetch} />;
    }

    const greeting = `Good day, ${user?.name?.split(' ')[0] ?? 'there'}`;

    // ---- Receptionist view: operational only, no revenue figures ----
    if (!isAdminDashboard(data)) {
        return (
            <div className="space-y-6">
                <header>
                    <h1 className="text-2xl font-semibold text-slate-900">{greeting}</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Today at the centre · {formatDate(new Date())}
                    </p>
                </header>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Today's bookings"
                        value={data.today.bookings}
                        icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                    />
                    <StatCard
                        label="Cash I collected today"
                        value={money(data.today.myCollection)}
                        icon={<BanknotesIcon className="h-5 w-5" />}
                        accent="bg-emerald-100 text-emerald-600"
                    />
                    <StatCard
                        label="Reports pending"
                        value={data.reports.pending}
                        icon={<DocumentTextIcon className="h-5 w-5" />}
                        accent="bg-amber-100 text-amber-600"
                    />
                    <StatCard
                        label="Reports delivered"
                        value={data.reports.delivered}
                        icon={<DocumentTextIcon className="h-5 w-5" />}
                        accent="bg-blue-100 text-blue-600"
                    />
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link
                        to="/billing/new"
                        className="rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
                    >
                        New booking
                    </Link>
                    <Link
                        to="/patients/new"
                        className="rounded-sm border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Register patient
                    </Link>
                    <Link
                        to="/patients"
                        className="rounded-sm border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Find a patient
                    </Link>
                </div>

                <section className="rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                    <h2 className="mb-4 text-lg font-semibold text-slate-900">
                        Outstanding payments
                    </h2>
                    {data.pendingPayments.length === 0 ? (
                        <p className="rounded-sm border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                            Nothing outstanding. Every invoice is settled.
                        </p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {data.pendingPayments.map((invoice) => (
                                <li
                                    key={invoice._id}
                                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                                >
                                    <div>
                                        <Link
                                            to={`/billing/${invoice._id}`}
                                            className="font-mono text-xs font-semibold text-brand transition hover:text-brand-dark"
                                        >
                                            {invoice.invoiceNumber}
                                        </Link>
                                        <span className="ml-3 text-sm text-slate-800">
                                            {invoice.patientInfo.name}
                                        </span>
                                        <span className="ml-3 text-xs text-slate-500">
                                            {formatDate(invoice.visitDate)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <StatusBadge status={invoice.paymentStatus} />
                                        <span className="font-semibold tabular-nums text-rose-500">
                                            {money(invoice.dueAmount)}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        );
    }

    // ---- Admin view: full financial overview ----
    const chartData = data.trend.map((point) => ({
        date: point._id,
        collected: point.collected,
    }));

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">{greeting}</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Financial overview · {formatDate(new Date())}
                    </p>
                </div>
                <div className="flex gap-1 rounded-sm bg-slate-100 p-1">
                    {RANGES.map((range) => (
                        <button
                            key={range.label}
                            type="button"
                            onClick={() => setRangeDays(range.days)}
                            className={`rounded-sm px-4 py-1.5 text-xs font-semibold transition ${
                                rangeDays === range.days
                                    ? 'bg-white text-brand shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Collected today"
                    value={money(data.today.collected)}
                    icon={<BanknotesIcon className="h-5 w-5" />}
                    accent="bg-emerald-100 text-emerald-600"
                />
                <StatCard
                    label="Bookings today"
                    value={data.today.invoiceCount}
                    icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                />
                <StatCard
                    label="New patients today"
                    value={data.today.newPatients}
                    icon={<UserGroupIcon className="h-5 w-5" />}
                    accent="bg-blue-100 text-blue-600"
                />
                <StatCard
                    label="Total outstanding"
                    value={money(data.outstanding.total)}
                    icon={<ExclamationTriangleIcon className="h-5 w-5" />}
                    accent="bg-rose-100 text-rose-600"
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Collected in period" value={money(data.period.collected)} />
                <StatCard label="Net billed" value={money(data.period.net)} />
                <StatCard label="Waivers given" value={money(data.period.waiver)} />
                <StatCard
                    label="Commission pending"
                    value={money(data.commission.pending)}
                />
            </div>

            <section className="rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Cash collected</h2>
                {chartData.length === 0 ? (
                    <p className="py-12 text-center text-sm text-slate-500">
                        No payments in this period.
                    </p>
                ) : (
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="collected" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={70}
                                    tickFormatter={(value) => `৳${Number(value).toLocaleString()}`}
                                />
                                <Tooltip
                                    formatter={(value: number) => [money(value), 'Collected']}
                                    contentStyle={{
                                        borderRadius: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '0.8rem',
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="collected"
                                    stroke="#2563eb"
                                    strokeWidth={2}
                                    fill="url(#collected)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                    <h2 className="mb-4 text-lg font-semibold text-slate-900">Top referrers</h2>
                    {data.byReferrer.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-500">
                            No referred bookings in this period.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="py-2 font-semibold">Referrer</th>
                                        <th className="py-2 text-right font-semibold">Invoices</th>
                                        <th className="py-2 text-right font-semibold">Net</th>
                                        <th className="py-2 text-right font-semibold">Commission</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.byReferrer.slice(0, 8).map((row) => (
                                        <tr key={row._id}>
                                            <td className="py-2.5 text-slate-800">{row.referrerName}</td>
                                            <td className="py-2.5 text-right tabular-nums text-slate-600">
                                                {row.invoiceCount}
                                            </td>
                                            <td className="py-2.5 text-right tabular-nums text-slate-900">
                                                {money(row.net)}
                                            </td>
                                            <td className="py-2.5 text-right tabular-nums text-amber-600">
                                                {money(row.commission)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Recent activity
                        </h2>
                        <Link
                            to="/activity"
                            className="text-xs font-semibold text-brand transition hover:text-brand-dark"
                        >
                            View all
                        </Link>
                    </div>
                    {data.recentActivity.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-500">
                            Nothing recorded yet.
                        </p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {data.recentActivity.map((entry) => (
                                <li key={entry._id} className="py-2.5">
                                    <p className="text-sm text-slate-700">{entry.summary}</p>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {entry.actorName} · {formatDateTime(entry.at)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                    <h2 className="mb-4 text-lg font-semibold text-slate-900">
                        Collection by receptionist
                    </h2>
                    {data.byReceptionist.length === 0 ? (
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
                                {data.byReceptionist.map((row) => (
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
            </div>
        </div>
    );
};

export default DashboardPage;
