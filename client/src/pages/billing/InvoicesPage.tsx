import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDate, money, toDhakaDateInput } from '@/lib/format';
import { useGetInvoicesQuery } from '@/services/invoicesApi';
import type { PaymentStatus } from '@/services/invoicesApi';

const PAGE_SIZE = 20;

const STATUS_FILTERS: { label: string; value: PaymentStatus | '' }[] = [
    { label: 'All', value: '' },
    { label: 'Unpaid', value: 'unpaid' },
    { label: 'Partially paid', value: 'partial' },
    { label: 'Paid', value: 'paid' },
];

const InvoicesPage = () => {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<PaymentStatus | ''>('');
    const [date, setDate] = useState('');
    const [page, setPage] = useState(1);

    const { data, isLoading, isFetching, isError, refetch } = useGetInvoicesQuery({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        paymentStatus: status || undefined,
        date: date || undefined,
    });

    const invoices = data?.items ?? [];
    const total = data?.meta.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const resetTo = (updater: () => void) => {
        updater();
        setPage(1);
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {total} {total === 1 ? 'invoice' : 'invoices'}
                    </p>
                </div>
                <Link
                    to="/billing/new"
                    className="inline-flex items-center gap-2 rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
                >
                    <PlusIcon className="h-5 w-5" />
                    New booking
                </Link>
            </header>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[16rem] flex-1">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => resetTo(() => setSearch(e.target.value))}
                        placeholder="Search by invoice number, patient name or phone"
                        className="w-full rounded-sm border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                </div>

                <input
                    type="date"
                    value={date}
                    max={toDhakaDateInput()}
                    onChange={(e) => resetTo(() => setDate(e.target.value))}
                    className="rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                {date && (
                    <button
                        type="button"
                        onClick={() => resetTo(() => setDate(''))}
                        className="text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                    >
                        Clear date
                    </button>
                )}

                <div className="flex gap-1 rounded-sm bg-slate-100 p-1">
                    {STATUS_FILTERS.map((filter) => (
                        <button
                            key={filter.label}
                            type="button"
                            onClick={() => resetTo(() => setStatus(filter.value))}
                            className={`rounded-sm px-4 py-1.5 text-xs font-semibold transition ${
                                status === filter.value
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
                <Loader message="Loading invoices..." />
            ) : isError ? (
                <ErrorState title="Could not load invoices" onRetry={refetch} />
            ) : invoices.length === 0 ? (
                <div className="rounded-sm border border-dashed border-slate-200 bg-white/70 p-12 text-center">
                    <p className="text-sm font-medium text-slate-500">
                        No invoices match these filters.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-sm border border-white/60 bg-white/80 shadow-card shadow-slate-200/40 backdrop-blur">
                    <table className="w-full min-w-[52rem] text-left text-sm">
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
                            {invoices.map((invoice) => (
                                <tr
                                    key={invoice._id}
                                    className={`transition hover:bg-slate-50/70 ${
                                        invoice.isCancelled ? 'opacity-50' : ''
                                    }`}
                                >
                                    <td className="px-5 py-4">
                                        <Link
                                            to={`/billing/${invoice._id}`}
                                            className="font-mono text-xs font-semibold text-brand transition hover:text-brand-dark"
                                        >
                                            {invoice.invoiceNumber}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-4 text-slate-500">
                                        {formatDate(invoice.visitDate)}
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="font-medium text-slate-900">
                                            {invoice.patientInfo.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {invoice.patientInfo.patientId} · {invoice.patientInfo.phone}
                                        </p>
                                    </td>
                                    <td className="px-5 py-4 text-slate-600">
                                        {invoice.referrerInfo?.name ?? (
                                            <span className="text-slate-400">Walk-in</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-right tabular-nums text-slate-900">
                                        {money(invoice.netPayable)}
                                    </td>
                                    <td className="px-5 py-4 text-right tabular-nums text-emerald-600">
                                        {money(invoice.paidAmount)}
                                    </td>
                                    <td
                                        className={`px-5 py-4 text-right font-semibold tabular-nums ${
                                            invoice.dueAmount > 0 ? 'text-rose-500' : 'text-slate-400'
                                        }`}
                                    >
                                        {money(invoice.dueAmount)}
                                    </td>
                                    <td className="px-5 py-4">
                                        {invoice.isCancelled ? (
                                            <StatusBadge status="cancelled" />
                                        ) : (
                                            <StatusBadge status={invoice.paymentStatus} />
                                        )}
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
                        Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={page === 1 || isFetching}
                            onClick={() => setPage((current) => current - 1)}
                            className="rounded-sm border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={page === totalPages || isFetching}
                            onClick={() => setPage((current) => current + 1)}
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

export default InvoicesPage;
