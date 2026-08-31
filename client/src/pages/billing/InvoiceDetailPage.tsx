import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    CheckCircleIcon,
    PrinterIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import StatusBadge from '@/components/common/StatusBadge';
import { useRole } from '@/hooks/useRole';
import { apiErrorMessage, formatDate, formatDateTime, money } from '@/lib/format';
import {
    useCancelInvoiceMutation,
    useGetInvoiceQuery,
    useGetReportLinkMutation,
    useMarkReportDeliveredMutation,
    useUploadReportMutation,
} from '@/services/invoicesApi';
import {
    useCreatePaymentMutation,
    useGetInvoicePaymentsQuery,
    useVoidPaymentMutation,
} from '@/services/paymentsApi';

const fieldClass =
    'w-full rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

const InvoiceDetailPage = () => {
    const { id } = useParams();
    const { isAdmin } = useRole();

    const { data: invoice, isLoading, isError, refetch } = useGetInvoiceQuery(id!);
    const { data: payments = [] } = useGetInvoicePaymentsQuery(id!);

    const [createPayment, { isLoading: isPaying }] = useCreatePaymentMutation();
    const [voidPayment] = useVoidPaymentMutation();
    const [uploadReport, { isLoading: isUploading }] = useUploadReportMutation();
    const [markDelivered] = useMarkReportDeliveredMutation();
    const [getReportLink] = useGetReportLinkMutation();
    const [cancelInvoice] = useCancelInvoiceMutation();

    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (isLoading) return <Loader message="Loading invoice..." />;
    if (isError || !invoice) {
        return (
            <ErrorState
                title="Could not load invoice"
                description="This invoice is unavailable."
                onRetry={refetch}
            />
        );
    }

    const handlePayment = async (event: React.FormEvent) => {
        event.preventDefault();
        const value = Number(amount);

        if (!Number.isFinite(value) || value <= 0) {
            toast.error('Enter an amount greater than zero');
            return;
        }
        // The server rejects this too; catching it here saves a round trip.
        if (value > invoice.dueAmount) {
            toast.error(`Amount exceeds the outstanding due of ${money(invoice.dueAmount)}`);
            return;
        }

        try {
            const result = await createPayment({
                invoice: invoice._id,
                amount: value,
                note: note.trim() || undefined,
            }).unwrap();

            toast.success(`Receipt ${result.payment.receiptNumber} recorded`);
            setAmount('');
            setNote('');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not record the payment'));
        }
    };

    const handleVoid = async (paymentId: string, receiptNumber: string) => {
        const reason = window.prompt(
            `Void receipt ${receiptNumber}? The invoice due will go back up.\n\nReason:`
        );
        if (!reason?.trim()) return;

        try {
            await voidPayment({
                id: paymentId,
                reason: reason.trim(),
                invoiceId: invoice._id,
            }).unwrap();
            toast.success('Payment voided');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not void the payment'));
        }
    };

    const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        const itemId = uploadingItemId;
        event.target.value = '';

        if (!file || !itemId) return;

        try {
            await uploadReport({ invoiceId: invoice._id, itemId, file }).unwrap();
            toast.success('Report uploaded');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not upload the report'));
        } finally {
            setUploadingItemId(null);
        }
    };

    const handleDownload = async (itemId: string) => {
        try {
            const { url } = await getReportLink({
                invoiceId: invoice._id,
                itemId,
            }).unwrap();
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not open the report'));
        }
    };

    const handleDeliver = async (itemId: string) => {
        try {
            await markDelivered({ invoiceId: invoice._id, itemId }).unwrap();
            toast.success('Marked as delivered');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not update the report'));
        }
    };

    const handleCancel = async () => {
        const reason = window.prompt('Why is this invoice being cancelled?');
        if (!reason?.trim()) return;

        try {
            await cancelInvoice({ id: invoice._id, reason: reason.trim() }).unwrap();
            toast.success('Invoice cancelled');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not cancel the invoice'));
        }
    };

    return (
        <div className="space-y-6">
            <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileSelected}
                className="hidden"
            />

            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-mono text-2xl font-semibold text-slate-900">
                            {invoice.invoiceNumber}
                        </h1>
                        {invoice.isCancelled ? (
                            <StatusBadge status="cancelled" />
                        ) : (
                            <StatusBadge status={invoice.paymentStatus} />
                        )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        {formatDate(invoice.visitDate)} ·{' '}
                        <Link
                            to={`/patients/${typeof invoice.patient === 'string' ? invoice.patient : invoice.patient._id}`}
                            className="font-medium text-brand transition hover:text-brand-dark"
                        >
                            {invoice.patientInfo.name}
                        </Link>{' '}
                        ({invoice.patientInfo.patientId})
                    </p>
                </div>

                <div className="flex gap-3">
                    <Link
                        to={`/billing/${invoice._id}/print`}
                        className="inline-flex items-center gap-2 rounded-sm border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        <PrinterIcon className="h-5 w-5" />
                        Print
                    </Link>
                    {isAdmin && !invoice.isCancelled && invoice.paidAmount === 0 && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="rounded-sm border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-500 transition hover:bg-rose-50"
                        >
                            Cancel invoice
                        </button>
                    )}
                </div>
            </header>

            {invoice.isCancelled && (
                <div className="rounded-sm border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                    This invoice was cancelled.
                    {invoice.cancelReason ? ` Reason: ${invoice.cancelReason}` : ''}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <div className="space-y-6">
                    <section className="overflow-hidden rounded-sm border border-white/60 bg-white/80 shadow-card shadow-slate-200/40 backdrop-blur">
                        <h2 className="border-b border-slate-100 px-6 py-4 text-lg font-semibold text-slate-900">
                            Tests &amp; reports
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[36rem] text-left text-sm">
                                <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Test</th>
                                        <th className="px-6 py-3 text-right font-semibold">Price</th>
                                        <th className="px-6 py-3 font-semibold">Report</th>
                                        <th className="px-6 py-3 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoice.items.map((item) => (
                                        <tr key={item._id}>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs font-semibold text-brand">
                                                    {item.testCode}
                                                </span>{' '}
                                                <span className="text-slate-800">{item.testName}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right tabular-nums text-slate-900">
                                                {money(item.price)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge
                                                    status={
                                                        item.reportStatus === 'uploaded'
                                                            ? 'partial'
                                                            : item.reportStatus === 'delivered'
                                                              ? 'completed'
                                                              : 'pending'
                                                    }
                                                />
                                                <span className="ml-2 text-xs capitalize text-slate-500">
                                                    {item.reportStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-3 text-xs font-semibold">
                                                    {item.reportFile && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDownload(item._id)}
                                                            className="inline-flex items-center gap-1 text-brand transition hover:text-brand-dark"
                                                        >
                                                            <ArrowDownTrayIcon className="h-4 w-4" />
                                                            View
                                                        </button>
                                                    )}
                                                    {!invoice.isCancelled && (
                                                        <button
                                                            type="button"
                                                            disabled={isUploading}
                                                            onClick={() => {
                                                                setUploadingItemId(item._id);
                                                                fileInputRef.current?.click();
                                                            }}
                                                            className="inline-flex items-center gap-1 text-slate-500 transition hover:text-slate-700 disabled:opacity-50"
                                                        >
                                                            <ArrowUpTrayIcon className="h-4 w-4" />
                                                            {item.reportFile ? 'Replace' : 'Upload'}
                                                        </button>
                                                    )}
                                                    {item.reportStatus === 'uploaded' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeliver(item._id)}
                                                            className="inline-flex items-center gap-1 text-emerald-600 transition hover:text-emerald-700"
                                                        >
                                                            <CheckCircleIcon className="h-4 w-4" />
                                                            Delivered
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                        <h2 className="mb-4 text-lg font-semibold text-slate-900">Payment history</h2>

                        {payments.length === 0 ? (
                            <p className="rounded-sm border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                                No payments recorded yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {payments.map((payment) => (
                                    <li
                                        key={payment._id}
                                        className={`flex flex-wrap items-center justify-between gap-3 rounded-sm px-4 py-3 text-sm ${
                                            payment.isVoided
                                                ? 'bg-rose-50/60 line-through opacity-60'
                                                : 'bg-slate-50'
                                        }`}
                                    >
                                        <div>
                                            <span className="font-mono text-xs font-semibold text-brand">
                                                {payment.receiptNumber}
                                            </span>
                                            <span className="ml-3 text-slate-500">
                                                {formatDateTime(payment.paymentDate)}
                                            </span>
                                            <span className="ml-3 text-slate-500">
                                                by {payment.receivedByName}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-semibold tabular-nums text-slate-900">
                                                {money(payment.amount)}
                                            </span>
                                            {isAdmin && !payment.isVoided && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleVoid(payment._id, payment.receiptNumber)
                                                    }
                                                    className="text-xs font-semibold text-rose-500 transition hover:text-rose-600"
                                                >
                                                    Void
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                    <section className="rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                        <h2 className="mb-4 text-lg font-semibold text-slate-900">Billing</h2>

                        {invoice.referrerInfo && (
                            <p className="mb-4 rounded-sm bg-amber-50/70 px-4 py-3 text-sm text-slate-600">
                                Referred by{' '}
                                <strong className="text-slate-900">{invoice.referrerInfo.name}</strong>
                                {invoice.referrerInfo.hospital
                                    ? ` · ${invoice.referrerInfo.hospital}`
                                    : ''}
                            </p>
                        )}

                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Gross</dt>
                                <dd className="tabular-nums text-slate-900">
                                    {money(invoice.grossAmount)}
                                </dd>
                            </div>
                            {invoice.waiverAmount > 0 && (
                                <div className="flex justify-between text-amber-600">
                                    <dt>Waiver ({invoice.waiverPercent}%)</dt>
                                    <dd className="tabular-nums">−{money(invoice.waiverAmount)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
                                <dt className="text-slate-900">Net payable</dt>
                                <dd className="tabular-nums text-slate-900">
                                    {money(invoice.netPayable)}
                                </dd>
                            </div>
                            <div className="flex justify-between text-emerald-600">
                                <dt>Paid</dt>
                                <dd className="tabular-nums">{money(invoice.paidAmount)}</dd>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold">
                                <dt className="text-slate-900">Due</dt>
                                <dd
                                    className={`tabular-nums ${
                                        invoice.dueAmount > 0 ? 'text-rose-500' : 'text-emerald-600'
                                    }`}
                                >
                                    {money(invoice.dueAmount)}
                                </dd>
                            </div>

                            {/* Commission is admin-only and never on the patient's invoice. */}
                            {invoice.referrerInfo && invoice.commissionAmount !== undefined && (
                                <div className="mt-3 flex justify-between border-t border-dashed border-slate-200 pt-3 text-xs text-slate-500">
                                    <dt>
                                        Referrer commission ({invoice.commissionPercent}% of net) ·{' '}
                                        {invoice.commissionStatus}
                                    </dt>
                                    <dd className="tabular-nums">{money(invoice.commissionAmount)}</dd>
                                </div>
                            )}
                        </dl>
                    </section>

                    {!invoice.isCancelled && invoice.dueAmount > 0 && (
                        <form
                            onSubmit={handlePayment}
                            className="space-y-4 rounded-sm border border-emerald-200 bg-white/90 p-6 shadow-card shadow-slate-200/40 backdrop-blur"
                        >
                            <h2 className="text-lg font-semibold text-slate-900">Take cash payment</h2>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Amount (৳)
                                </label>
                                <input
                                    type="number"
                                    min="0.01"
                                    max={invoice.dueAmount}
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className={`${fieldClass} tabular-nums`}
                                    placeholder={String(invoice.dueAmount)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setAmount(String(invoice.dueAmount))}
                                    className="mt-1.5 text-xs font-semibold text-brand transition hover:text-brand-dark"
                                >
                                    Pay full due ({money(invoice.dueAmount)})
                                </button>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Note <span className="text-slate-400">(optional)</span>
                                </label>
                                <input
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className={fieldClass}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isPaying}
                                className="w-full rounded-sm bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                                {isPaying ? 'Recording...' : 'Record payment'}
                            </button>
                        </form>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default InvoiceDetailPage;
