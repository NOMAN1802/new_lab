import { useState } from 'react';
import DateRangePicker from '@/components/common/DateRangePicker';
import { rangeForDays } from '@/lib/dateRange';
import ErrorState from '@/components/common/ErrorState';
import ExportButtons from '@/components/common/ExportButtons';
import Loader from '@/components/common/Loader';
import StatCard from '@/components/common/StatCard';
import DataTable from '@/components/ui/DataTable';
import Panel from '@/components/ui/Panel';
import { money } from '@/lib/format';
import { useGetReferralCommissionReportQuery } from '@/services/reportsApi';
import type { ReferralCommissionRow } from '@/services/reportsApi';

const COLUMNS = [
    { header: 'Code', accessor: (r: ReferralCommissionRow) => r.referrerCode },
    { header: 'Referrer', accessor: (r: ReferralCommissionRow) => r.referrerName },
    { header: 'Hospital', accessor: (r: ReferralCommissionRow) => r.hospital ?? '' },
    { header: 'Invoices', accessor: (r: ReferralCommissionRow) => r.invoiceCount },
    { header: 'Gross billed', accessor: (r: ReferralCommissionRow) => r.grossBilled },
    { header: 'Discount given', accessor: (r: ReferralCommissionRow) => r.discountGiven },
    { header: 'Net billed', accessor: (r: ReferralCommissionRow) => r.netBilled },
    { header: 'Commission accrued', accessor: (r: ReferralCommissionRow) => r.commissionAccrued },
    { header: 'Commission paid', accessor: (r: ReferralCommissionRow) => r.commissionPaid },
    { header: 'Commission pending', accessor: (r: ReferralCommissionRow) => r.commissionPending },
];

const CommissionReportPage = () => {
    const [range, setRange] = useState(rangeForDays(29));
    const { data, isLoading, isError, refetch } = useGetReferralCommissionReportQuery(range);

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>Referral &amp; commission</h2>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)', maxWidth: 620 }}>
                        Discounts given and commission accrued, paid and pending by referrer.
                    </p>
                </div>
                <ExportButtons
                    title="Referral commission"
                    subtitle={`${range.startDate} to ${range.endDate}`}
                    filename={`commission-${range.startDate}-to-${range.endDate}`}
                    columns={COLUMNS}
                    rows={data?.rows ?? []}
                />
            </div>

            <DateRangePicker value={range} onChange={setRange} />

            {isLoading ? (
                <Loader message="Building commission report..." />
            ) : isError || !data ? (
                <ErrorState title="Could not load the commission report" onRetry={refetch} />
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px,1fr))', gap: 'var(--gap-grid)' }}>
                        <StatCard label="Referrers" value={data.summary.referrers} icon="user-round-search" accent="brand" />
                        <StatCard label="Discounts given" value={money(data.summary.discountGiven)} icon="percent" accent="neutral" />
                        <StatCard label="Commission accrued" value={money(data.summary.commissionAccrued)} icon="banknote" accent="neutral" />
                        <StatCard label="Commission pending" value={money(data.summary.commissionPending)} icon="hourglass" accent="warning" />
                    </div>

                    <Panel padding="0">
                        <DataTable<ReferralCommissionRow & { id: string }>
                            minWidth="62rem"
                            empty="No referred bookings in this date range."
                            rows={data.rows.map((row) => ({ ...row, id: row._id }))}
                            columns={[
                                {
                                    key: 'referrerName',
                                    header: 'Referrer',
                                    render: (row) => (
                                        <div>
                                            <p style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{row.referrerName}</p>
                                            <p style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                                                {row.referrerCode}
                                            </p>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'hospital',
                                    header: 'Hospital',
                                    render: (row) => row.hospital || <span style={{ color: 'var(--text-faint)' }}>—</span>,
                                },
                                { key: 'invoiceCount', header: 'Invoices', align: 'right' },
                                { key: 'grossBilled', header: 'Gross', align: 'right', render: (row) => money(row.grossBilled) },
                                {
                                    key: 'discountGiven',
                                    header: 'Discount',
                                    align: 'right',
                                    render: (row) => <span style={{ color: 'var(--warning-strong)' }}>{money(row.discountGiven)}</span>,
                                },
                                {
                                    key: 'netBilled',
                                    header: 'Net',
                                    align: 'right',
                                    render: (row) => <span style={{ color: 'var(--text-heading)' }}>{money(row.netBilled)}</span>,
                                },
                                { key: 'commissionAccrued', header: 'Accrued', align: 'right', render: (row) => money(row.commissionAccrued) },
                                {
                                    key: 'commissionPaid',
                                    header: 'Paid',
                                    align: 'right',
                                    render: (row) => <span style={{ color: 'var(--success-strong)' }}>{money(row.commissionPaid)}</span>,
                                },
                                {
                                    key: 'commissionPending',
                                    header: 'Pending',
                                    align: 'right',
                                    render: (row) => (
                                        <span
                                            style={{
                                                fontWeight: 600,
                                                color: row.commissionPending > 0 ? 'var(--danger-strong)' : 'var(--text-faint)',
                                            }}
                                        >
                                            {money(row.commissionPending)}
                                        </span>
                                    ),
                                },
                            ]}
                        />
                    </Panel>
                </>
            )}
        </>
    );
};

export default CommissionReportPage;
