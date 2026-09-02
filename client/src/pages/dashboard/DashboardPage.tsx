import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import DataTable from '@/components/ui/DataTable';
import SegmentedControl from '@/components/ui/SegmentedControl';
import AreaTrendChart from '@/components/ui/AreaTrendChart';
import GaugeMeter from '@/components/ui/GaugeMeter';
import Icon from '@/components/ui/Icon';
import { useAppSelector } from '@/hooks/store';
import { formatDate, formatDateTime, money, toDhakaDateInput } from '@/lib/format';
import { isAdminDashboard, useGetDashboardQuery } from '@/services/dashboardApi';
import type { ReferrerSummaryRow, UserCollectionRow } from '@/services/dashboardApi';

const daysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return toDhakaDateInput(date);
};

const RANGES = [
    { label: '7 days', value: '6' },
    { label: '30 days', value: '29' },
    { label: '90 days', value: '89' },
];

/** Axis labels stay short: the API sends a full ISO day per point. */
const shortDay = (iso: string) => {
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? iso : formatDate(parsed).replace(/,.*$/, '');
};

const compactMoney = (value: number) => `৳${Math.round(value / 1000)}K`;

const DashboardPage = () => {
    const user = useAppSelector((state) => state.auth.user);
    const navigate = useNavigate();
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
            <>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>{greeting}</h2>
                        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>
                            Today at the centre · {formatDate(new Date())} · Asia/Dhaka
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <Button variant="secondary" icon="user-round-plus" onClick={() => navigate('/patients/new')}>
                            Register patient
                        </Button>
                        <Button icon="plus" onClick={() => navigate('/billing/new')}>
                            New booking
                        </Button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px,1fr))', gap: 'var(--gap-grid)' }}>
                    <StatCard label="Today's bookings" value={data.today.bookings} icon="clipboard-list" />
                    <StatCard label="Cash I collected today" value={money(data.today.myCollection)} icon="banknote" accent="accent" />
                    <StatCard label="Reports pending" value={data.reports.pending} icon="file-text" accent="warning" />
                    <StatCard label="Reports delivered" value={data.reports.delivered} icon="file-text" accent="brand" />
                </div>

                <Panel title="Outstanding payments" subtitle="Invoices still carrying a balance">
                    {data.pendingPayments.length === 0 ? (
                        <p
                            style={{
                                border: '1px dashed var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-8)',
                                textAlign: 'center',
                                fontSize: 'var(--text-13)',
                                color: 'var(--text-muted)',
                            }}
                        >
                            Nothing outstanding. Every invoice is settled.
                        </p>
                    ) : (
                        <DataTable
                            minWidth="46rem"
                            rows={data.pendingPayments.map((invoice) => ({ ...invoice, id: invoice._id }))}
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
                                    key: 'patient',
                                    header: 'Patient',
                                    render: (row) => (
                                        <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{row.patientInfo.name}</span>
                                    ),
                                },
                                { key: 'visitDate', header: 'Date', render: (row) => formatDate(row.visitDate) },
                                { key: 'paymentStatus', header: 'Status', render: (row) => <StatusBadge status={row.paymentStatus} /> },
                                {
                                    key: 'dueAmount',
                                    header: 'Due',
                                    align: 'right',
                                    render: (row) => (
                                        <span style={{ fontWeight: 600, color: 'var(--danger-strong)' }}>{money(row.dueAmount)}</span>
                                    ),
                                },
                            ]}
                        />
                    )}
                </Panel>
            </>
        );
    }

    // ---- Admin view: full financial overview ----
    const trend = data.trend.map((point) => ({ label: shortDay(point._id), value: point.collected }));
    const rangeLabel = RANGES.find((range) => Number(range.value) === rangeDays)?.label ?? `${rangeDays + 1} days`;

    // Collection rate is derived, not stored: cash in over what was actually billed.
    const collectionRate = data.period.net > 0 ? (data.period.collected / data.period.net) * 100 : 0;

    const tiles: [string, string, string][] = [
        ['Collected in period', money(data.period.collected), 'var(--brand)'],
        ['Net billed', money(data.period.net), 'var(--accent)'],
        ['Discounts given', money(data.period.discount), 'var(--warning)'],
    ];

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>{greeting}</h2>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>
                        Financial overview · {formatDate(new Date())} · Asia/Dhaka
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <SegmentedControl options={RANGES} value={String(rangeDays)} onChange={(value) => setRangeDays(Number(value))} />
                    <Button icon="plus" onClick={() => navigate('/billing/new')}>
                        New booking
                    </Button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px,1fr))', gap: 'var(--gap-grid)' }}>
                <StatCard label="Collected today" value={money(data.today.collected)} icon="banknote" accent="accent" />
                <StatCard label="Bookings today" value={data.today.invoiceCount} icon="clipboard-list" />
                <StatCard label="New patients today" value={data.today.newPatients} icon="user-round-plus" accent="brand" />
                <StatCard
                    label="Total outstanding"
                    value={money(data.outstanding.total)}
                    icon="triangle-alert"
                    accent="danger"
                    caption={`across ${data.outstanding.invoiceCount} invoices`}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px,1fr))', gap: 'var(--gap-grid)' }}>
                <Panel
                    title="Cash collected"
                    subtitle={`Last ${rangeLabel} · grouped on Asia/Dhaka calendar days`}
                    action={
                        <span
                            style={{
                                fontSize: 24,
                                fontWeight: 700,
                                color: 'var(--text-heading)',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {money(data.period.collected)}
                        </span>
                    }
                >
                    {trend.length === 0 ? (
                        <p style={{ padding: '48px 0', textAlign: 'center', fontSize: 'var(--text-13)', color: 'var(--text-muted)' }}>
                            No payments in this period.
                        </p>
                    ) : (
                        <AreaTrendChart data={trend} height={214} valueFormat={(v) => compactMoney(Number(v))} />
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 18 }}>
                        {tiles.map(([label, value, color]) => (
                            <div
                                key={label}
                                style={{
                                    border: '1px solid var(--border-card)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '12px 14px',
                                    borderBottom: `3px solid ${color}`,
                                }}
                            >
                                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', fontVariantNumeric: 'tabular-nums' }}>
                                    {value}
                                </p>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</p>
                            </div>
                        ))}
                    </div>
                </Panel>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-grid)' }}>
                    <Panel title="Collection rate" subtitle="Cash collected against net billed, this period">
                        <GaugeMeter value={collectionRate} size={210} caption={`${money(data.period.collected)} of ${money(data.period.net)}`} />
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                            <Button variant="secondary" size="sm" onClick={() => navigate('/reports/financial')}>
                                Show details
                            </Button>
                        </div>
                    </Panel>
                    <Panel title="Commission" subtitle="Accrued on net, never on gross">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                ['Accrued', money(data.commission.accrued), 'var(--text-heading)'],
                                ['Paid out', money(data.commission.paid), 'var(--success-strong)'],
                                ['Pending', money(data.commission.pending), 'var(--warning-strong)'],
                            ].map(([label, value, color]) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
                                    <span style={{ fontSize: 15, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px,1fr))', gap: 'var(--gap-grid)' }}>
                <Panel title="Top referrers" subtitle="Commission accrues on net, never on gross">
                    <DataTable<ReferrerSummaryRow & { id: string }>
                        dense
                        minWidth="30rem"
                        empty="No referred bookings in this period."
                        rows={data.byReferrer.slice(0, 8).map((row) => ({ ...row, id: row._id }))}
                        columns={[
                            {
                                key: 'referrerName',
                                header: 'Referrer',
                                render: (row) => (
                                    <div>
                                        <p style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{row.referrerName}</p>
                                        <p style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>{row.referrerCode}</p>
                                    </div>
                                ),
                            },
                            { key: 'invoiceCount', header: 'Invoices', align: 'right' },
                            { key: 'net', header: 'Net', align: 'right', render: (row) => money(row.net) },
                            {
                                key: 'commission',
                                header: 'Commission',
                                align: 'right',
                                render: (row) => (
                                    <span style={{ color: 'var(--warning-strong)', fontWeight: 600 }}>{money(row.commission)}</span>
                                ),
                            },
                        ]}
                    />
                </Panel>

                <Panel
                    title="Recent activity"
                    action={
                        <Link to="/activity" style={{ fontSize: 12, fontWeight: 600 }}>
                            View all
                        </Link>
                    }
                >
                    {data.recentActivity.length === 0 ? (
                        <p style={{ padding: '32px 0', textAlign: 'center', fontSize: 'var(--text-13)', color: 'var(--text-muted)' }}>
                            Nothing recorded yet.
                        </p>
                    ) : (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
                            {data.recentActivity.map((entry, i) => (
                                <li
                                    key={entry._id}
                                    style={{
                                        display: 'flex',
                                        gap: 12,
                                        padding: '11px 0',
                                        borderBottom: i === data.recentActivity.length - 1 ? 'none' : '1px solid var(--surface-muted)',
                                    }}
                                >
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 28,
                                            height: 28,
                                            borderRadius: 8,
                                            background: 'var(--surface-muted)',
                                            color: 'var(--text-muted)',
                                            flex: '0 0 auto',
                                        }}
                                    >
                                        <Icon name="history" size={15} />
                                    </span>
                                    <div>
                                        <p style={{ fontSize: 13, color: 'var(--text-body)' }}>{entry.summary}</p>
                                        <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                                            {entry.actorName} · {formatDateTime(entry.at)}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>

            <Panel title="Collection by receptionist" subtitle="Cash taken at the front desk in this period">
                <DataTable<UserCollectionRow & { id: string }>
                    dense
                    minWidth="24rem"
                    empty="No cash collected in this period."
                    rows={data.byReceptionist.map((row) => ({ ...row, id: row._id }))}
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
        </>
    );
};

export default DashboardPage;
