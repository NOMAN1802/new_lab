import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import DateRangePicker from '@/components/common/DateRangePicker';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import StatCard from '@/components/common/StatCard';
import { rangeForDays } from '@/lib/dateRange';
import { formatDateTime } from '@/lib/format';
import {
    useGetActivityByUserQuery,
    useGetActivityQuery,
} from '@/services/activityApi';

/** Colour by how much scrutiny the action deserves. */
const TONE: Record<string, string> = {
    'payment.voided': 'bg-rose-100 text-rose-700',
    'invoice.cancelled': 'bg-rose-100 text-rose-700',
    'test.price_changed': 'bg-amber-100 text-amber-700',
    'commission.paid_out': 'bg-amber-100 text-amber-700',
    'user.created': 'bg-amber-100 text-amber-700',
    'user.removed': 'bg-rose-100 text-rose-700',
    'payment.recorded': 'bg-emerald-100 text-emerald-700',
    'invoice.created': 'bg-blue-100 text-blue-700',
};

const ACTION_FILTERS = [
    { label: 'Everything', value: '' },
    { label: 'Payments', value: 'payment.recorded' },
    { label: 'Voids', value: 'payment.voided' },
    { label: 'Cancellations', value: 'invoice.cancelled' },
    { label: 'Price changes', value: 'test.price_changed' },
];

const ActivityPage = () => {
    const [range, setRange] = useState(rangeForDays(6));
    const [search, setSearch] = useState('');
    const [action, setAction] = useState('');
    const [page, setPage] = useState(1);

    const { data, isLoading, isFetching, isError, refetch } = useGetActivityQuery({
        ...range,
        page,
        limit: 30,
        search: search.trim() || undefined,
        action: action || undefined,
    });

    const { data: byUser = [] } = useGetActivityByUserQuery(range);

    const entries = data?.items ?? [];
    const total = data?.meta.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / 30));

    const resetTo = (fn: () => void) => {
        fn();
        setPage(1);
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-semibold text-slate-900">User activity</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Who did what, and when. Covers money, patient records, prices and
                    access.
                </p>
            </header>

            <DateRangePicker value={range} onChange={(r) => resetTo(() => setRange(r))} />

            {byUser.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {byUser.slice(0, 4).map((row) => (
                        <StatCard
                            key={row._id}
                            label={`${row.name} · ${row.role}`}
                            value={row.events}
                            trend={{
                                value: 0,
                                isPositive: true,
                                label: `last seen ${formatDateTime(row.lastSeen)}`,
                            }}
                        />
                    ))}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[16rem] flex-1">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => resetTo(() => setSearch(e.target.value))}
                        placeholder="Search by staff name, invoice number or description"
                        className="w-full rounded-sm border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                </div>

                <div className="flex flex-wrap gap-1 rounded-sm bg-slate-100 p-1">
                    {ACTION_FILTERS.map((filter) => (
                        <button
                            key={filter.label}
                            type="button"
                            onClick={() => resetTo(() => setAction(filter.value))}
                            className={`rounded-sm px-4 py-1.5 text-xs font-semibold transition ${
                                action === filter.value
                                    ? 'bg-white text-brand shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <Loader message="Loading activity..." />
            ) : isError ? (
                <ErrorState title="Could not load activity" onRetry={refetch} />
            ) : entries.length === 0 ? (
                <div className="rounded-sm border border-dashed border-slate-200 bg-white/70 p-12 text-center">
                    <p className="text-sm font-medium text-slate-500">
                        No activity recorded in this period.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-sm border border-white/60 bg-white/80 shadow-card shadow-slate-200/40 backdrop-blur">
                    <table className="w-full min-w-[46rem] text-left text-sm">
                        <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-5 py-4 font-semibold">When</th>
                                <th className="px-5 py-4 font-semibold">Who</th>
                                <th className="px-5 py-4 font-semibold">Action</th>
                                <th className="px-5 py-4 font-semibold">Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {entries.map((entry) => (
                                <tr key={entry._id} className="hover:bg-slate-50/70">
                                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                        {formatDateTime(entry.at)}
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="font-medium text-slate-900">
                                            {entry.actorName}
                                        </p>
                                        <p className="text-xs capitalize text-slate-500">
                                            {entry.actorRole}
                                        </p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span
                                            className={`inline-flex rounded-sm px-2.5 py-1 font-mono text-xs font-semibold ${
                                                TONE[entry.action] ?? 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {entry.action}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-slate-700">
                                        {entry.summary}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                        Page {page} of {totalPages} · {total} events
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={page === 1 || isFetching}
                            onClick={() => setPage((p) => p - 1)}
                            className="rounded-sm border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={page === totalPages || isFetching}
                            onClick={() => setPage((p) => p + 1)}
                            className="rounded-sm border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityPage;
