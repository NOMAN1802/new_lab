import { useState } from 'react';
import DateRangePicker from '@/components/common/DateRangePicker';
import { rangeForDays } from '@/lib/dateRange';
import ErrorState from '@/components/common/ErrorState';
import ExportButtons from '@/components/common/ExportButtons';
import Loader from '@/components/common/Loader';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import Panel from '@/components/ui/Panel';
import { formatDate } from '@/lib/format';
import { useGetPatientReportQuery } from '@/services/reportsApi';
import type { PatientReportRow } from '@/services/reportsApi';

const COLUMNS = [
    { header: 'Invoice', accessor: (row: PatientReportRow) => row.invoiceNumber },
    { header: 'Date', accessor: (row: PatientReportRow) => formatDate(row.visitDate) },
    { header: 'Patient ID', accessor: (row: PatientReportRow) => row.patientId },
    { header: 'Name', accessor: (row: PatientReportRow) => row.patientName },
    { header: 'Age', accessor: (row: PatientReportRow) => row.age },
    { header: 'Sex', accessor: (row: PatientReportRow) => row.gender },
    { header: 'Phone', accessor: (row: PatientReportRow) => row.phone },
    { header: 'Tests', accessor: (row: PatientReportRow) => row.tests.join(', ') },
    { header: 'Reports pending', accessor: (row: PatientReportRow) => row.reportsPending },
    { header: 'Payment', accessor: (row: PatientReportRow) => row.paymentStatus },
];

const PatientReportPage = () => {
    const [range, setRange] = useState(rangeForDays(29));
    const { data, isLoading, isError, refetch } = useGetPatientReportQuery(range);

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>Patient report</h2>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)', maxWidth: 620 }}>
                        Visits, tests performed and report status for the selected dates.
                    </p>
                </div>
                <ExportButtons
                    title="Patient report"
                    subtitle={`${range.startDate} to ${range.endDate}`}
                    filename={`patient-report-${range.startDate}-to-${range.endDate}`}
                    columns={COLUMNS}
                    rows={data?.rows ?? []}
                />
            </div>

            <DateRangePicker value={range} onChange={setRange} />

            {isLoading ? (
                <Loader message="Building report..." />
            ) : isError || !data ? (
                <ErrorState title="Could not load the patient report" onRetry={refetch} />
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px,1fr))', gap: 'var(--gap-grid)' }}>
                        <StatCard label="Visits" value={data.summary.visits} icon="clipboard-list" />
                        <StatCard label="New patients" value={data.summary.newPatients} icon="user-round-plus" accent="brand" />
                        <StatCard label="Tests performed" value={data.summary.testsPerformed} icon="flask-conical" accent="neutral" />
                        <StatCard label="Patients on file" value={data.summary.totalPatients} icon="users" accent="neutral" />
                    </div>

                    <Panel padding="0">
                        <DataTable<PatientReportRow & { id: string }>
                            minWidth="56rem"
                            empty="No visits in this date range."
                            rows={data.rows.map((row) => ({ ...row, id: row.invoiceNumber }))}
                            columns={[
                                {
                                    key: 'invoiceNumber',
                                    header: 'Invoice',
                                    mono: true,
                                    render: (row) => <span style={{ fontWeight: 600, color: 'var(--brand)' }}>{row.invoiceNumber}</span>,
                                },
                                {
                                    key: 'visitDate',
                                    header: 'Date',
                                    render: (row) => <span style={{ color: 'var(--text-muted)' }}>{formatDate(row.visitDate)}</span>,
                                },
                                {
                                    key: 'patientName',
                                    header: 'Patient',
                                    render: (row) => (
                                        <div>
                                            <p style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{row.patientName}</p>
                                            <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                                                {row.patientId} · {row.phone}
                                            </p>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'ageSex',
                                    header: 'Age / Sex',
                                    render: (row) => (
                                        <span style={{ textTransform: 'capitalize' }}>
                                            {row.age} / {row.gender}
                                        </span>
                                    ),
                                },
                                { key: 'tests', header: 'Tests', render: (row) => row.tests.join(', ') },
                                { key: 'reportsPending', header: 'Pending', align: 'right' },
                                { key: 'paymentStatus', header: 'Payment', render: (row) => <StatusBadge status={row.paymentStatus} /> },
                            ]}
                        />
                    </Panel>
                </>
            )}
        </>
    );
};

export default PatientReportPage;
