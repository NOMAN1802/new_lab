import { useState } from 'react';
import DateRangePicker from '@/components/common/DateRangePicker';
import { rangeForDays } from '@/lib/dateRange';
import ErrorState from '@/components/common/ErrorState';
import ExportButtons from '@/components/common/ExportButtons';
import Loader from '@/components/common/Loader';
import StatCard from '@/components/common/StatCard';
import AreaTrendChart from '@/components/ui/AreaTrendChart';
import DataTable from '@/components/ui/DataTable';
import GaugeMeter from '@/components/ui/GaugeMeter';
import Panel from '@/components/ui/Panel';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { money } from '@/lib/format';
import { useGetCollectionByUserReportQuery, useGetFinancialSummaryQuery, useGetRevenueReportQuery } from '@/services/reportsApi';
import type { UserCollectionRow } from '@/services/dashboardApi';

type GroupBy = 'daily' | 'monthly' | 'yearly';

const GROUPS = [
    { label: 'Daily', value: 'daily' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
];

const compactMoney = (value: number) => `৳${Math.round(value / 1000)}K`;

const FinancialReportPage = () => {
    const [range, setRange] = useState(rangeForDays(29));
    const [groupBy, setGroupBy] = useState<GroupBy>('daily');

    const summaryQuery = useGetFinancialSummaryQuery(range);
    const revenueQuery = useGetRevenueReportQuery({ ...range, groupBy });
    const collectionQuery = useGetCollectionByUserReportQuery(range);

    const isLoading = summaryQuery.isLoading || revenueQuery.isLoading || collectionQuery.isLoading;
    const isError = summaryQuery.isError || revenueQuery.isError;

    const summary = summaryQuery.data;
    const series = revenueQuery.data?.series ?? [];
    const collections = collectionQuery.data?.rows ?? [];

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>Financial summary</h2>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)', maxWidth: 620 }}>
                        Billed and collected are separate: an invoice raised today may be collected next week.
                    </p>
                </div>
                <ExportButtons
                    title="Revenue"
                    subtitle={`${range.startDate} to ${range.endDate}`}
                    filename={`revenue-${range.startDate}-to-${range.endDate}`}
                    columns={[
                        { header: 'Period', accessor: (row: { _id: string }) => row._id },
                        { header: 'Collected (BDT)', accessor: (row: { collected: number }) => row.collected },
                        { header: 'Receipts', accessor: (row: { receipts: number }) => row.receipts },
                    ]}
                    rows={series}
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <DateRangePicker value={range} onChange={setRange} />
                <SegmentedControl options={GROUPS} value={groupBy} onChange={(value) => setGroupBy(value as GroupBy)} />
            </div>

            {isLoading ? (
                <Loader message="Building financial summary..." />
            ) : isError || !summary ? (
                <ErrorState
                    title="Could not load the financial summary"
                    onRetry={() => {
                        summaryQuery.refetch();
                        revenueQuery.refetch();
                    }}
                />
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px,1fr))', gap: 'var(--gap-grid)' }}>
                        <StatCard label="Cash collected" value={money(summary.cashCollected)} icon="banknote" accent="accent" />
                        <StatCard
                            label="Net billed"
                            value={money(summary.netBilled)}
                            icon="receipt-text"
                            caption={`${summary.invoiceCount} invoices`}
                        />
                        <StatCard label="Outstanding" value={money(summary.outstanding)} icon="triangle-alert" accent="danger" />
                        <StatCard label="Commission accrued" value={money(summary.commissionAccrued)} icon="user-round-search" accent="warning" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px,1fr))', gap: 'var(--gap-grid)' }}>
                        <StatCard label="Gross billed" value={money(summary.grossBilled)} accent="neutral" />
                        <StatCard
                            label="Discounts given"
                            value={money(summary.discountGiven)}
                            accent="neutral"
                            trend={{ value: summary.discountRate, isPositive: false, label: 'of gross' }}
                        />
                        <StatCard label="Invoices" value={summary.invoiceCount} accent="neutral" />
                        <StatCard
                            label="Net after commission"
                            value={money(summary.netAfterCommission)}
                            accent="neutral"
                            trend={{ value: summary.collectionRate, isPositive: true, label: 'collected' }}
                        />
                    </div>

                    <Panel title={`Cash collected, ${groupBy}`} subtitle="Grouped on Asia/Dhaka calendar days">
                        {series.length === 0 ? (
                            <p style={{ padding: '48px 0', textAlign: 'center', fontSize: 'var(--text-13)', color: 'var(--text-muted)' }}>
                                No payments in this period.
                            </p>
                        ) : (
                            <AreaTrendChart
                                data={series.map((point) => ({ label: point._id, value: point.collected }))}
                                height={260}
                                valueFormat={(v) => compactMoney(Number(v))}
                            />
                        )}
                    </Panel>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 'var(--gap-grid)' }}>
                        <Panel title="Collection by receptionist">
                            <DataTable<UserCollectionRow & { id: string }>
                                dense
                                minWidth="24rem"
                                empty="No cash collected in this period."
                                rows={collections.map((row) => ({ ...row, id: row._id }))}
                                columns={[
                                    { key: 'name', header: 'Staff' },
                                    { key: 'receipts', header: 'Receipts', align: 'right' },
                                    {
                                        key: 'collected',
                                        header: 'Collected',
                                        align: 'right',
                                        render: (row) => <span style={{ color: 'var(--success-strong)', fontWeight: 600 }}>{money(row.collected)}</span>,
                                    },
                                ]}
                            />
                        </Panel>

                        <Panel title="Collection rate">
                            <GaugeMeter value={summary.collectionRate} size={200} caption="of net billed, this period" />
                        </Panel>
                    </div>
                </>
            )}
        </>
    );
};

export default FinancialReportPage;
