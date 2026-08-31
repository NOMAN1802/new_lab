import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import { apiErrorMessage } from '@/lib/format';
import {
    useCreateTestCategoryMutation,
    useDeleteTestCategoryMutation,
    useGetTestCategoriesQuery,
    useUpdateTestCategoryMutation,
} from '@/services/testCategoriesApi';
import type { TestCategory } from '@/services/testCategoriesApi';

const fieldClass =
    'w-full rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

const TestCategoriesPage = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [editing, setEditing] = useState<TestCategory | null>(null);

    const { data, isLoading, isError, refetch } = useGetTestCategoriesQuery();
    const [createCategory, { isLoading: isCreating }] = useCreateTestCategoryMutation();
    const [updateCategory, { isLoading: isUpdating }] = useUpdateTestCategoryMutation();
    const [deleteCategory] = useDeleteTestCategoryMutation();

    const reset = () => {
        setName('');
        setDescription('');
        setEditing(null);
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

    const startEdit = (category: TestCategory) => {
        setEditing(category);
        setName(category.name);
        setDescription(category.description ?? '');
    };

    const categories = data?.items ?? [];

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Group tests into Pathology, Radiology, Consultation and so on.
                </p>
            </header>

            <form
                onSubmit={handleSubmit}
                className="grid gap-4 rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
            >
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={fieldClass}
                        placeholder="Pathology"
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Description <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={fieldClass}
                    />
                </div>
                <div className="flex gap-2">
                    {editing && (
                        <button
                            type="button"
                            onClick={reset}
                            className="rounded-sm border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isCreating || isUpdating}
                        className="inline-flex items-center gap-2 rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark disabled:opacity-60"
                    >
                        <PlusIcon className="h-5 w-5" />
                        {editing ? 'Save' : 'Add'}
                    </button>
                </div>
            </form>

            {isLoading ? (
                <Loader message="Loading departments..." />
            ) : isError ? (
                <ErrorState title="Could not load departments" onRetry={refetch} />
            ) : categories.length === 0 ? (
                <div className="rounded-sm border border-dashed border-slate-200 bg-white/70 p-12 text-center">
                    <p className="text-sm font-medium text-slate-500">No departments yet.</p>
                </div>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => (
                        <li
                            key={category._id}
                            className="rounded-sm border border-white/60 bg-white/80 p-5 shadow-card shadow-slate-200/40 backdrop-blur"
                        >
                            <p className="font-semibold text-slate-900">{category.name}</p>
                            {category.description && (
                                <p className="mt-1 text-sm text-slate-500">{category.description}</p>
                            )}
                            <div className="mt-4 flex gap-3 text-xs font-semibold">
                                <button
                                    type="button"
                                    onClick={() => startEdit(category)}
                                    className="text-brand transition hover:text-brand-dark"
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(category)}
                                    className="text-rose-500 transition hover:text-rose-600"
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default TestCategoriesPage;
