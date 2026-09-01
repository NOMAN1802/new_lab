import { Link, useParams } from 'react-router-dom';
import { PencilSquareIcon, PlusIcon } from '@heroicons/react/24/outline';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import StatusBadge from '@/components/common/StatusBadge';
import { useRole } from '@/hooks/useRole';
import { formatDate, money } from '@/lib/format';
import { useGetPatientHistoryQuery } from '@/services/invoicesApi';

const PatientDetailPage = () => {
    const { id } = useParams();
    const { isAdmin } = useRole();

    const { data, isLoading, isError, refetch } = useGetPatientHistoryQuery(id!);

    if (isLoading) return <Loader message="Loading visit history..." />;
    if (isError || !data) {
        return (
            <ErrorState
                title="Could not load patient"
                description="This patient's history is unavailable."
                onRetry={refetch}
            />
        );
    }

    const { patient, invoices } = data;

    const totals = invoices.reduce(
        (acc, invoice) => ({
            billed: acc.billed + invoice.netPayable,
            paid: acc.paid + invoice.paidAmount,
            due: acc.due + invoice.dueAmount,
        }),
        { billed: 0, paid: 0, due: 0 }
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-semibold text-slate-900">{patient.name}</h1>
                        <span className="rounded-sm bg-brand/10 px-3 py-1 font-mono text-xs font-semibold text-brand">
                            {patient.patientId}
                        </span>
                    </div>
                    <p className="mt-1 text-sm capitalize text-slate-500">
                        {patient.age} years · {patient.gender} · {patient.phone}
                        {patient.address ? ` · ${patient.address}` : ''}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to={`/patients/${patient._id}/edit`}
                        className="inline-flex items-center gap-2 rounded-sm border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        <PencilSquareIcon className="h-5 w-5" />
                        Edit
                    </Link>
                    <Link
                        to={`/billing/new?patient=${patient._id}`}
                        className="inline-flex items-center gap-2 rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
                    >
                        <PlusIcon className="h-5 w-5" />
                        New visit
                    </Link>
                </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-sm border border-white/60 bg-white/80 p-5 shadow-card shadow-slate-200/40 backdrop-blur">
                    <p className="text-sm font-medium text-slate-500">Visits</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{invoices.length}</p>
                </div>
                <div className="rounded-sm border border-white/60 bg-white/80 p-5 shadow-card shadow-slate-200/40 backdrop-blur">
                    <p className="text-sm font-medium text-slate-500">Total paid</p>
                    <p className="mt-2 text-3xl font-semibold text-emerald-600 tabular-nums">
                        {money(totals.paid)}
                    </p>
                </div>
                <div className="rounded-sm border border-white/60 bg-white/80 p-5 shadow-card shadow-slate-200/40 backdrop-blur">
                    <p className="text-sm font-medium text-slate-500">Outstanding</p>
                    <p
                        className={`mt-2 text-3xl font-semibold tabular-nums ${
                            totals.due > 0 ? 'text-rose-500' : 'text-slate-900'
                        }`}
                    >
                        {money(totals.due)}
                    </p>
                </div>
            </div>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">Visit history</h2>

                {invoices.length === 0 ? (
                    <div className="rounded-sm border border-dashed border-slate-200 bg-white/70 p-12 text-center">
                        <p className="text-sm font-medium text-slate-500">
                            No visits recorded for this patient yet.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {invoices.map((invoice) => (
                            <article
                                key={invoice._id}
                                className={`rounded-sm border bg-white/80 p-5 shadow-card shadow-slate-200/40 backdrop-blur ${
                                    invoice.isCancelled
                                        ? 'border-rose-100 opacity-70'
                                        : 'border-white/60'
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <Link
                                            to={`/billing/${invoice._id}`}
                                            className="font-mono text-sm font-semibold text-brand transition hover:text-brand-dark"
                                        >
                                            {invoice.invoiceNumber}
                                        </Link>
                                        <span className="text-sm text-slate-500">
                                            {formatDate(invoice.visitDate)}
                                        </span>
                                        {invoice.isCancelled ? (
                                            <StatusBadge status="cancelled" />
                                        ) : (
                                            <StatusBadge status={invoice.paymentStatus} />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-5 text-sm tabular-nums">
                                        {/* Gross and discount are withheld from receptionists. */}
                                        {isAdmin && invoice.discountAmount !== undefined && invoice.discountAmount > 0 && (
                                            <span className="text-amber-600">
                                                Discount {money(invoice.discountAmount)}
                                            </span>
                                        )}
                                        <span className="text-slate-600">
                                            Payable{' '}
                                            <strong className="text-slate-900">
                                                {money(invoice.netPayable)}
                                            </strong>
                                        </span>
                                        {invoice.dueAmount > 0 && (
                                            <span className="text-rose-500">
                                                Due {money(invoice.dueAmount)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <ul className="mt-4 flex flex-wrap gap-2">
                                    {invoice.items.map((item) => (
                                        <li
                                            key={item._id}
                                            className="inline-flex items-center gap-2 rounded-sm bg-slate-100 px-3 py-1 text-xs text-slate-600"
                                        >
                                            {item.testName}
                                            <span
                                                className={`h-1.5 w-1.5 rounded-sm ${
                                                    item.reportStatus === 'delivered'
                                                        ? 'bg-emerald-500'
                                                        : item.reportStatus === 'uploaded'
                                                          ? 'bg-blue-500'
                                                          : 'bg-slate-300'
                                                }`}
                                                title={`Report ${item.reportStatus}`}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default PatientDetailPage;
