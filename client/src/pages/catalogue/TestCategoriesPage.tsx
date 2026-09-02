import { useState } from 'react';
import { toast } from 'sonner';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Icon from '@/components/ui/Icon';
import Panel from '@/components/ui/Panel';
import TextField from '@/components/ui/TextField';
import { apiErrorMessage } from '@/lib/format';
import {
    useCreateTestCategoryMutation,
    useDeleteTestCategoryMutation,
    useGetTestCategoriesQuery,
    useUpdateTestCategoryMutation,
} from '@/services/testCategoriesApi';
import type { TestCategory } from '@/services/testCategoriesApi';

const rowAction: React.CSSProperties = {
    border: 0,
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize: 12,
    fontWeight: 600,
};

const TestCategoriesPage = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [editing, setEditing] = useState<TestCategory | null>(null);
    const [isFormOpen, setFormOpen] = useState(false);

    const { data, isLoading, isError, refetch } = useGetTestCategoriesQuery();
    const [createCategory, { isLoading: isCreating }] = useCreateTestCategoryMutation();
    const [updateCategory, { isLoading: isUpdating }] = useUpdateTestCategoryMutation();
    const [deleteCategory] = useDeleteTestCategoryMutation();

    const reset = () => {
        setName('');
        setDescription('');
        setEditing(null);
        setFormOpen(false);
    };

    const startCreate = () => {
        // Clearing `editing` matters: otherwise the form would submit an update.
        setEditing(null);
        setName('');
        setDescription('');
        setFormOpen(true);
    };

    const startEdit = (category: TestCategory) => {
        setEditing(category);
        setName(category.name);
        setDescription(category.description ?? '');
        setFormOpen(true);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!name.trim()) {
            toast.error('Department name is required');
            return;
        }

        const payload = {
            name: name.trim(),
            description: description.trim() || undefined,
        };

        try {
            if (editing) {
                await updateCategory({ id: editing._id, data: payload }).unwrap();
                toast.success('Department updated');
            } else {
                await createCategory(payload).unwrap();
                toast.success('Department created');
            }
            reset();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not save department'));
        }
    };

    const handleDelete = async (category: TestCategory) => {
        if (!window.confirm(`Delete the "${category.name}" department?`)) return;
        try {
            await deleteCategory(category._id).unwrap();
            toast.success('Department deleted');
        } catch (error) {
            // The API refuses when tests still reference it, and says how many.
            toast.error(apiErrorMessage(error, 'Could not delete department'));
        }
    };

    const categories = data?.items ?? [];
    const isSaving = isCreating || isUpdating;

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>Departments</h2>
                    <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>
                        Every test belongs to one department. Reports group revenue by these.
                    </p>
                </div>
                <Button icon="plus" onClick={startCreate}>
                    Add department
                </Button>
            </div>

            {isFormOpen && (
                <Panel title={editing ? `Edit ${editing.name}` : 'New department'} style={{ borderColor: 'var(--indigo-200)' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 18 }}>
                            <TextField label="Department name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pathology" />
                            <TextField
                                label="Description"
                                optional
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What this department covers"
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <Button variant="secondary" onClick={reset}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={isSaving}>
                                {isSaving ? 'Saving...' : editing ? 'Save changes' : 'Add department'}
                            </Button>
                        </div>
                    </form>
                </Panel>
            )}

            {isLoading ? (
                <Loader message="Loading departments..." />
            ) : isError ? (
                <ErrorState title="Could not load departments" onRetry={refetch} />
            ) : (
                <>
                    <Panel padding="0">
                        <DataTable<TestCategory & { id: string }>
                            minWidth="36rem"
                            empty="No departments yet."
                            rows={categories.map((category) => ({ ...category, id: category._id }))}
                            columns={[
                                {
                                    key: 'name',
                                    header: 'Department',
                                    render: (category) => <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{category.name}</span>,
                                },
                                {
                                    key: 'description',
                                    header: 'Description',
                                    render: (category) => category.description || <span style={{ color: 'var(--text-faint)' }}>—</span>,
                                },
                                {
                                    key: 'actions',
                                    header: 'Actions',
                                    align: 'right',
                                    render: (category) => (
                                        <span style={{ display: 'inline-flex', gap: 12 }}>
                                            <button type="button" onClick={() => startEdit(category)} style={{ ...rowAction, color: 'var(--brand)' }}>
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(category)}
                                                style={{ ...rowAction, color: 'var(--danger-strong)' }}
                                            >
                                                Delete
                                            </button>
                                        </span>
                                    ),
                                },
                            ]}
                        />
                    </Panel>

                    <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-faint)' }}>
                        <Icon name="info" size={14} />A department cannot be deleted while tests still reference it.
                    </p>
                </>
            )}
        </>
    );
};

export default TestCategoriesPage;
