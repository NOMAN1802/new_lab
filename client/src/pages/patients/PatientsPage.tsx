import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import { useRole } from '@/hooks/useRole';
import { apiErrorMessage, formatDate } from '@/lib/format';
import {
    useDeletePatientMutation,
    useGetPatientsQuery,
} from '@/services/patientsApi';

const PAGE_SIZE = 20;

const PatientsPage = () => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const { isAdmin } = useRole();

    const { data, isLoading, isFetching, isError, refetch } = useGetPatientsQuery({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
    });

    const [deletePatient, { isLoading: isDeleting }] = useDeletePatientMutation();

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Delete patient "${name}"? Their visit history stays on file.`)) {
            return;
        }
        try {
            await deletePatient(id).unwrap();
            toast.success('Patient deleted');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not delete patient'));
        }
    };

    const patients = data?.items ?? [];
    const total = data?.meta.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {total} registered {total === 1 ? 'patient' : 'patients'}
                    </p>
                </div>
                <Link
                    to="/patients/new"
                    className="inline-flex items-center gap-2 rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
                >
                    <UserPlusIcon className="h-5 w-5" />
                    Register patient
                </Link>
            </header>

            <div className="relative max-w-md">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                    placeholder="Search by name, phone or patient ID"
                    className="w-full rounded-sm border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
            </div>

            {isLoading ? (
                <Loader message="Loading patients..." />
            ) : isError ? (
                <ErrorState
                    title="Could not load patients"
                    description="The patient list is unavailable right now."
                    onRetry={refetch}
                />
            ) : patients.length === 0 ? (
                <div className="rounded-sm border border-dashed border-slate-200 bg-white/70 p-12 text-center">
                    <p className="text-sm font-medium text-slate-500">
                        {search
                            ? `No patients match "${search}".`
                            : 'No patients registered yet.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-sm border border-white/60 bg-white/80 shadow-card shadow-slate-200/40 backdrop-blur">
                    <table className="w-full min-w-[46rem] text-left text-sm">
                        <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-5 py-4 font-semibold">Patient ID</th>
                                <th className="px-5 py-4 font-semibold">Name</th>
                                <th className="px-5 py-4 font-semibold">Age / Sex</th>
                                <th className="px-5 py-4 font-semibold">Phone</th>
                                <th className="px-5 py-4 font-semibold">Registered</th>
                                <th className="px-5 py-4 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {patients.map((patient) => (
                                <tr key={patient._id} className="transition hover:bg-slate-50/70">
                                    <td className="px-5 py-4 font-mono text-xs font-semibold text-brand">
                                        {patient.patientId}
                                    </td>
                                    <td className="px-5 py-4 font-medium text-slate-900">
                                        {patient.name}
                                    </td>
                                    <td className="px-5 py-4 capitalize text-slate-600">
                                        {patient.age} / {patient.gender}
                                    </td>
                                    <td className="px-5 py-4 tabular-nums text-slate-600">
                                        {patient.phone}
                                    </td>
                                    <td className="px-5 py-4 text-slate-500">
                                        {formatDate(patient.createdAt)}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-3 text-xs font-semibold">
                                            <Link
                                                to={`/patients/${patient._id}`}
                                                className="text-brand transition hover:text-brand-dark"
                                            >
                                                History
                                            </Link>
                                            <Link
                                                to={`/billing/new?patient=${patient._id}`}
                                                className="text-emerald-600 transition hover:text-emerald-700"
                                            >
                                                Book tests
                                            </Link>
                                            <Link
                                                to={`/patients/${patient._id}/edit`}
                                                className="text-slate-500 transition hover:text-slate-700"
                                            >
                                                Edit
                                            </Link>
                                            {isAdmin && (
                                                <button
                                                    type="button"
                                                    disabled={isDeleting}
                                                    onClick={() => handleDelete(patient._id, patient.name)}
                                                    className="text-rose-500 transition hover:text-rose-600 disabled:opacity-50"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                        Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={page === 1 || isFetching}
                            onClick={() => setPage((current) => current - 1)}
                            className="rounded-sm border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={page === totalPages || isFetching}
                            onClick={() => setPage((current) => current + 1)}
                            className="rounded-sm border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientsPage;
