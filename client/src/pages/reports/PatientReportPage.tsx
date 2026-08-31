import { useState } from 'react';
import DateRangePicker from '@/components/common/DateRangePicker';
import { rangeForDays } from '@/lib/dateRange';
import ErrorState from '@/components/common/ErrorState';
import ExportButtons from '@/components/common/ExportButtons';
import Loader from '@/components/common/Loader';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
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
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Patient report</h1>
                    <p className="mt-1 text-sm text-slate-500">
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
            </header>

            <DateRangePicker value={range} onChange={setRange} />

            {isLoading ? (
                <Loader message="Building report..." />
            ) : isError || !data ? (
                <ErrorState title="Could not load the patient report" onRetry={refetch} />
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard label="Visits" value={data.summary.visits} />
                        <StatCard label="New patients" value={data.summary.newPatients} />
                        <StatCard label="Tests performed" value={data.summary.testsPerformed} />
                        <StatCard label="Patients on file" value={data.summary.totalPatients} />
                    </div>

                    {data.rows.length === 0 ? (
                        <div className="rounded-sm border border-dashed border-slate-200 bg-white/70 p-12 text-center">
                            <p className="text-sm font-medium text-slate-500">
                                No visits in this date range.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-sm border border-white/60 bg-white/80 shadow-card shadow-slate-200/40 backdrop-blur">
                            <table className="w-full min-w-[56rem] text-left text-sm">
                                <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-4 font-semibold">Invoice</th>
                                        <th className="px-5 py-4 font-semibold">Date</th>
                                        <th className="px-5 py-4 font-semibold">Patient</th>
                                        <th className="px-5 py-4 font-semibold">Age / Sex</th>
                                        <th className="px-5 py-4 font-semibold">Tests</th>
                                        <th className="px-5 py-4 text-right font-semibold">Pending</th>
                                        <th className="px-5 py-4 font-semibold">Payment</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.rows.map((row) => (
                                        <tr key={row.invoiceNumber} className="hover:bg-slate-50/70">
                                            <td className="px-5 py-4 font-mono text-xs font-semibold text-brand">
                                                {row.invoiceNumber}
                                            </td>
                                            <td className="px-5 py-4 text-slate-500">
                                                {formatDate(row.visitDate)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="font-medium text-slate-900">
                                                    {row.patientName}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {row.patientId} · {row.phone}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4 capitalize text-slate-600">
                                                {row.age} / {row.gender}
                                            </td>
                                            <td className="px-5 py-4 text-slate-600">
                                                {row.tests.join(', ')}
                                            </td>
                                            <td className="px-5 py-4 text-right tabular-nums text-slate-600">
                                                {row.reportsPending}
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={row.paymentStatus} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default PatientReportPage;
