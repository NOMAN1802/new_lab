import { useState } from 'react';
import { Link } from 'react-router-dom';
import DateRangePicker from '@/components/common/DateRangePicker';
import { rangeForDays } from '@/lib/dateRange';
import ErrorState from '@/components/common/ErrorState';
import ExportButtons from '@/components/common/ExportButtons';
import Loader from '@/components/common/Loader';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import Panel from '@/components/ui/Panel';
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
        <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>Outstanding payments</h2>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)', maxWidth: 620 }}>
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
            </div>

            <DateRangePicker value={range} onChange={setRange} />

            {isLoading ? (
                <Loader message="Building dues report..." />
            ) : isError || !data ? (
                <ErrorState title="Could not load the dues report" onRetry={refetch} />
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: 'var(--gap-grid)' }}>
                        <StatCard
                            label="Total outstanding"
                            value={money(data.summary.totalDue)}
                            icon="triangle-alert"
                            accent="danger"
                            caption="Across the selected range"
                        />
                        <StatCard label="Invoices with a balance" value={data.summary.invoiceCount} icon="receipt-text" accent="warning" />
                    </div>

                    <Panel padding="0">
                        <DataTable<DuesReportRow & { id: string }>
                            minWidth="56rem"
                            empty="Nothing outstanding in this date range."
                            rows={data.rows.map((row) => ({ ...row, id: row._id }))}
                            columns={[
                                {
                                    key: 'invoiceNumber',
                                    header: 'Invoice',
                                    mono: true,
                                    render: (row) => (
                                        <Link to={`/billing/${row._id}`} style={{ fontWeight: 600 }}>
                                            {row.invoiceNumber}
                                        </Link>
                                    ),
                                },
                                {
                                    key: 'visitDate',
                                    header: 'Date',
                                    render: (row) => <span style={{ color: 'var(--text-muted)' }}>{formatDate(row.visitDate)}</span>,
                                },
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
                                    render: (row) => <span style={{ fontWeight: 600, color: 'var(--danger-strong)' }}>{money(row.dueAmount)}</span>,
                                },
                                { key: 'paymentStatus', header: 'Status', render: (row) => <StatusBadge status={row.paymentStatus} /> },
                            ]}
                        />
                    </Panel>
                </>
            )}
        </>
    );
};

export default DuesReportPage;
