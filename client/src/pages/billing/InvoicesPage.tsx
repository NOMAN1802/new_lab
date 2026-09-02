import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import SegmentedControl from '@/components/ui/SegmentedControl';
import TextField from '@/components/ui/TextField';
import { formatDate, money, toDhakaDateInput } from '@/lib/format';
import { useGetInvoicesQuery } from '@/services/invoicesApi';
import type { Invoice, PaymentStatus } from '@/services/invoicesApi';

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
    const navigate = useNavigate();

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
        <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>Invoices</h2>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>
                        {total} {total === 1 ? 'invoice' : 'invoices'} · {invoices.length} shown
                    </p>
                </div>
                <Button icon="plus" onClick={() => navigate('/billing/new')}>
                    New booking
                </Button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260, maxWidth: 420 }}>
                    <TextField
                        icon="search"
                        type="search"
                        value={search}
                        onChange={(e) => resetTo(() => setSearch(e.target.value))}
                        placeholder="Search by invoice number, patient name or phone"
                    />
                </div>

                <TextField
                    type="date"
                    value={date}
                    max={toDhakaDateInput()}
                    onChange={(e) => resetTo(() => setDate(e.target.value))}
                    style={{ width: 180 }}
                />
                {date && (
                    <Button variant="ghost" size="sm" onClick={() => resetTo(() => setDate(''))}>
                        Clear date
                    </Button>
                )}

                <SegmentedControl
                    options={STATUS_FILTERS.map((filter) => ({ label: filter.label, value: filter.value }))}
                    value={status}
                    onChange={(value) => resetTo(() => setStatus(value as PaymentStatus | ''))}
                />
            </div>

            {isLoading ? (
                <Loader message="Loading invoices..." />
            ) : isError ? (
                <ErrorState title="Could not load invoices" onRetry={refetch} />
            ) : (
                <>
                    <Panel padding="0">
                        <DataTable<Invoice & { id: string }>
                            minWidth="56rem"
                            empty="No invoices match these filters."
                            rows={invoices.map((invoice) => ({ ...invoice, id: invoice._id }))}
                            columns={[
                                {
                                    key: 'invoiceNumber',
                                    header: 'Invoice',
                                    mono: true,
                                    render: (row) => (
                                        <Link to={`/billing/${row._id}`} style={{ fontWeight: 600, opacity: row.isCancelled ? 0.5 : 1 }}>
                                            {row.invoiceNumber}
                                        </Link>
                                    ),
                                },
                                { key: 'visitDate', header: 'Date', render: (row) => formatDate(row.visitDate) },
                                {
                                    key: 'patient',
                                    header: 'Patient',
                                    render: (row) => (
                                        <div>
                                            <p style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{row.patientInfo.name}</p>
                                            <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                                                {row.patientInfo.patientId} · {row.patientInfo.phone}
                                            </p>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'referrer',
                                    header: 'Referrer',
                                    render: (row) => row.referrerInfo?.name ?? <span style={{ color: 'var(--text-faint)' }}>Walk-in</span>,
                                },
                                { key: 'netPayable', header: 'Payable', align: 'right', render: (row) => money(row.netPayable) },
                                {
                                    key: 'paidAmount',
                                    header: 'Paid',
                                    align: 'right',
                                    render: (row) => <span style={{ color: 'var(--success-strong)' }}>{money(row.paidAmount)}</span>,
                                },
                                {
                                    key: 'dueAmount',
                                    header: 'Due',
                                    align: 'right',
                                    render: (row) => (
                                        <span style={{ fontWeight: 600, color: row.dueAmount > 0 ? 'var(--danger-strong)' : 'var(--text-faint)' }}>
                                            {money(row.dueAmount)}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'paymentStatus',
                                    header: 'Status',
                                    render: (row) => <StatusBadge status={row.isCancelled ? 'cancelled' : row.paymentStatus} />,
                                },
                            ]}
                        />
                    </Panel>

                    <Pagination page={page} totalPages={totalPages} busy={isFetching} onChange={setPage} />
                </>
            )}
        </>
    );
};

export default InvoicesPage;
