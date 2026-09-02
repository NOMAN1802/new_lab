import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import InlineAlert from '@/components/ui/InlineAlert';
import Panel from '@/components/ui/Panel';
import TextField from '@/components/ui/TextField';
import { useRole } from '@/hooks/useRole';
import { apiErrorMessage, commissionBasis, formatDate, formatDateTime, money } from '@/lib/format';
import {
    useCancelInvoiceMutation,
    useGetInvoiceQuery,
    useGetReportLinkMutation,
    useMarkReportDeliveredMutation,
    useUploadReportMutation,
} from '@/services/invoicesApi';
import type { InvoiceItem } from '@/services/invoicesApi';
import { useCreatePaymentMutation, useGetInvoicePaymentsQuery, useVoidPaymentMutation } from '@/services/paymentsApi';

/** The item's own report state, mapped onto the badge vocabulary. */
const REPORT_BADGE: Record<string, string> = {
    uploaded: 'uploaded',
    delivered: 'delivered',
    pending: 'pending',
};

const linkButton = (color: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    border: 0,
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    fontWeight: 600,
    color,
});

const InvoiceDetailPage = () => {
    const { id } = useParams();
    const { isAdmin } = useRole();
    const navigate = useNavigate();

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
        return <ErrorState title="Could not load invoice" description="This invoice is unavailable." onRetry={refetch} />;
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
        const reason = window.prompt(`Void receipt ${receiptNumber}? The invoice due will go back up.\n\nReason:`);
        if (!reason?.trim()) return;

        try {
            await voidPayment({ id: paymentId, reason: reason.trim(), invoiceId: invoice._id }).unwrap();
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
            const { url } = await getReportLink({ invoiceId: invoice._id, itemId }).unwrap();
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

    const patientId = typeof invoice.patient === 'string' ? invoice.patient : invoice.patient._id;

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileSelected}
                hidden
            />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>
                            {invoice.invoiceNumber}
                        </h2>
                        <StatusBadge status={invoice.isCancelled ? 'cancelled' : invoice.paymentStatus} />
                    </div>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>
                        {formatDate(invoice.visitDate)} ·{' '}
                        <Link to={`/patients/${patientId}`} style={{ fontWeight: 600 }}>
                            {invoice.patientInfo.name}
                        </Link>{' '}
                        ({invoice.patientInfo.patientId})
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Button variant="secondary" icon="printer" onClick={() => navigate(`/billing/${invoice._id}/print`)}>
                        Print
                    </Button>
                    {isAdmin && !invoice.isCancelled && invoice.paidAmount === 0 && (
                        <Button variant="danger" onClick={handleCancel}>
                            Cancel invoice
                        </Button>
                    )}
                </div>
            </div>

            {invoice.isCancelled && (
                <InlineAlert tone="error">
                    This invoice was cancelled.{invoice.cancelReason ? ` Reason: ${invoice.cancelReason}` : ''}
                </InlineAlert>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px,1fr))', gap: 'var(--gap-grid)', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-grid)' }}>
                    <Panel title="Tests & reports" padding="var(--pad-panel) var(--pad-panel) 8px">
                        <DataTable<InvoiceItem & { id: string }>
                            minWidth="36rem"
                            rows={invoice.items.map((item) => ({ ...item, id: item._id }))}
                            columns={[
                                {
                                    key: 'testName',
                                    header: 'Test',
                                    render: (item) => (
                                        <span>
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--brand)' }}>
                                                {item.testCode}
                                            </span>{' '}
                                            <span style={{ color: 'var(--text-heading)' }}>{item.testName}</span>
                                        </span>
                                    ),
                                },
                                { key: 'price', header: 'Price', align: 'right', render: (item) => money(item.price) },
                                {
                                    key: 'reportStatus',
                                    header: 'Report',
                                    render: (item) => <StatusBadge status={REPORT_BADGE[item.reportStatus] ?? item.reportStatus} />,
                                },
                                {
                                    key: 'actions',
                                    header: 'Actions',
                                    align: 'right',
                                    render: (item) => (
                                        <span style={{ display: 'inline-flex', gap: 12, justifyContent: 'flex-end' }}>
                                            {item.reportFile && (
                                                <button type="button" onClick={() => handleDownload(item._id)} style={linkButton('var(--brand)')}>
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
                                                    style={{ ...linkButton('var(--text-muted)'), opacity: isUploading ? 0.5 : 1 }}
                                                >
                                                    {item.reportFile ? 'Replace' : 'Upload'}
                                                </button>
                                            )}
                                            {item.reportStatus === 'uploaded' && (
                                                <button type="button" onClick={() => handleDeliver(item._id)} style={linkButton('var(--success-strong)')}>
                                                    Delivered
                                                </button>
                                            )}
                                        </span>
                                    ),
                                },
                            ]}
                        />
                    </Panel>

                    <Panel title="Payment history" subtitle="Receipts stay on the ledger even when voided">
                        {payments.length === 0 ? (
                            <p
                                style={{
                                    border: '1px dashed var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-8)',
                                    textAlign: 'center',
                                    fontSize: 13,
                                    color: 'var(--text-muted)',
                                }}
                            >
                                No payments recorded yet.
                            </p>
                        ) : (
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {payments.map((payment) => (
                                    <li
                                        key={payment._id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                            flexWrap: 'wrap',
                                            background: payment.isVoided ? 'var(--danger-bg)' : 'var(--surface-sunken)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '10px 14px',
                                            fontSize: 13,
                                            textDecoration: payment.isVoided ? 'line-through' : 'none',
                                            opacity: payment.isVoided ? 0.7 : 1,
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--brand)' }}>
                                                {payment.receiptNumber}
                                            </span>
                                            <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>{formatDateTime(payment.paymentDate)}</span>
                                            <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>by {payment.receivedByName}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-heading)', fontVariantNumeric: 'tabular-nums' }}>
                                                {money(payment.amount)}
                                            </span>
                                            {isAdmin && !payment.isVoided && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleVoid(payment._id, payment.receiptNumber)}
                                                    style={linkButton('var(--danger-strong)')}
                                                >
                                                    Void
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-grid)', position: 'sticky', top: 'calc(var(--topbar-h) + 16px)' }}>
                    <Panel title="Billing">
                        {invoice.referrerInfo && (
                            <p
                                style={{
                                    marginBottom: 16,
                                    background: 'var(--warning-bg)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px 14px',
                                    fontSize: 13,
                                    color: 'var(--text-body)',
                                }}
                            >
                                Referred by <strong style={{ color: 'var(--text-heading)' }}>{invoice.referrerInfo.name}</strong>
                                {invoice.referrerInfo.hospital ? ` · ${invoice.referrerInfo.hospital}` : ''}
                            </p>
                        )}

                        <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <dt style={{ color: 'var(--text-muted)' }}>Gross</dt>
                                <dd style={{ margin: 0, color: 'var(--text-heading)', fontVariantNumeric: 'tabular-nums' }}>{money(invoice.grossAmount)}</dd>
                            </div>
                            {invoice.discountAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning-strong)' }}>
                                    <dt>Discount ({invoice.discountPercent}%)</dt>
                                    <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>−{money(invoice.discountAmount)}</dd>
                                </div>
                            )}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    borderTop: '1px solid var(--surface-muted)',
                                    paddingTop: 8,
                                    fontWeight: 600,
                                }}
                            >
                                <dt style={{ color: 'var(--text-heading)' }}>Net payable</dt>
                                <dd style={{ margin: 0, color: 'var(--text-heading)', fontVariantNumeric: 'tabular-nums' }}>{money(invoice.netPayable)}</dd>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success-strong)' }}>
                                <dt>Paid</dt>
                                <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{money(invoice.paidAmount)}</dd>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    borderTop: '1px solid var(--surface-muted)',
                                    paddingTop: 10,
                                    fontSize: 16,
                                    fontWeight: 700,
                                }}
                            >
                                <dt style={{ color: 'var(--text-heading)' }}>Due</dt>
                                <dd
                                    style={{
                                        margin: 0,
                                        color: invoice.dueAmount > 0 ? 'var(--danger-strong)' : 'var(--success-strong)',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {money(invoice.dueAmount)}
                                </dd>
                            </div>

                            {/* Below the line: what the centre pays the referrer.
                                It is not part of the patient's bill. */}
                            {invoice.referrerInfo && invoice.commissionAmount !== undefined && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                        borderTop: '1px dashed var(--border-subtle)',
                                        marginTop: 4,
                                        paddingTop: 10,
                                        fontSize: 12,
                                        color: 'var(--text-muted)',
                                    }}
                                >
                                    <dt>
                                        Referrer commission ({commissionBasis(invoice.commissionType, invoice.commissionValue)}) ·{' '}
                                        {invoice.commissionStatus}
                                    </dt>
                                    <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{money(invoice.commissionAmount)}</dd>
                                </div>
                            )}
                        </dl>
                    </Panel>

                    {!invoice.isCancelled && invoice.dueAmount > 0 && (
                        <Panel title="Take cash payment" style={{ borderColor: 'var(--teal-200)' }}>
                            <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <TextField
                                        label="Amount (৳)"
                                        type="number"
                                        min="0.01"
                                        max={invoice.dueAmount}
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder={String(invoice.dueAmount)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setAmount(String(invoice.dueAmount))}
                                        style={{ ...linkButton('var(--brand)'), alignSelf: 'flex-start' }}
                                    >
                                        Pay full due ({money(invoice.dueAmount)})
                                    </button>
                                </div>

                                <TextField label="Note" optional value={note} onChange={(e) => setNote(e.target.value)} />

                                <Button type="submit" variant="accent" block loading={isPaying}>
                                    {isPaying ? 'Recording...' : 'Record payment'}
                                </Button>
                            </form>
                        </Panel>
                    )}
                </div>
            </div>
        </>
    );
};

export default InvoiceDetailPage;
