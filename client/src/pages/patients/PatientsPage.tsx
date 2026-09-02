import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import Button from '@/components/ui/Button';
import Panel from '@/components/ui/Panel';
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import TextField from '@/components/ui/TextField';
import { useRole } from '@/hooks/useRole';
import { apiErrorMessage, formatDate } from '@/lib/format';
import { useDeletePatientMutation, useGetPatientsQuery } from '@/services/patientsApi';
import type { Patient } from '@/services/patientsApi';

const PAGE_SIZE = 20;

const PatientsPage = () => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const { isAdmin } = useRole();
    const navigate = useNavigate();

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
        <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>Patients</h2>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>
                        {total} registered {total === 1 ? 'patient' : 'patients'}
                    </p>
                </div>
                <Button icon="user-round-plus" onClick={() => navigate('/patients/new')}>
                    Register patient
                </Button>
            </div>

            <div style={{ maxWidth: 420 }}>
                <TextField
                    icon="search"
                    type="search"
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                    placeholder="Search by name, phone or patient ID"
                />
            </div>

            {isLoading ? (
                <Loader message="Loading patients..." />
            ) : isError ? (
                <ErrorState title="Could not load patients" description="The patient list is unavailable right now." onRetry={refetch} />
            ) : (
                <>
                    <Panel padding="0">
                        <DataTable<Patient & { id: string }>
                            minWidth="46rem"
                            empty={search ? `No patients match "${search}".` : 'No patients registered yet.'}
                            rows={patients.map((patient) => ({ ...patient, id: patient._id }))}
                            columns={[
                                {
                                    key: 'patientId',
                                    header: 'Patient ID',
                                    mono: true,
                                    render: (row) => (
                                        <Link to={`/patients/${row._id}`} style={{ fontWeight: 600 }}>
                                            {row.patientId}
                                        </Link>
                                    ),
                                },
                                {
                                    key: 'name',
                                    header: 'Name',
                                    render: (row) => <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{row.name}</span>,
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
                                { key: 'phone', header: 'Phone', render: (row) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.phone}</span> },
                                {
                                    key: 'createdAt',
                                    header: 'Registered',
                                    render: (row) => <span style={{ color: 'var(--text-muted)' }}>{formatDate(row.createdAt)}</span>,
                                },
                                {
                                    key: 'actions',
                                    header: 'Actions',
                                    align: 'right',
                                    render: (row) => (
                                        <span style={{ display: 'inline-flex', gap: 12, fontSize: 12, fontWeight: 600 }}>
                                            <Link to={`/patients/${row._id}`}>History</Link>
                                            <Link to={`/billing/new?patient=${row._id}`} style={{ color: 'var(--success-strong)' }}>
                                                Book tests
                                            </Link>
                                            <Link to={`/patients/${row._id}/edit`} style={{ color: 'var(--text-muted)' }}>
                                                Edit
                                            </Link>
                                            {isAdmin && (
                                                <button
                                                    type="button"
                                                    disabled={isDeleting}
                                                    onClick={() => handleDelete(row._id, row.name)}
                                                    style={{
                                                        border: 0,
                                                        background: 'transparent',
                                                        padding: 0,
                                                        cursor: 'pointer',
                                                        fontFamily: 'var(--font-sans)',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        color: 'var(--danger-strong)',
                                                        opacity: isDeleting ? 0.5 : 1,
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </span>
                                    ),
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

export default PatientsPage;
