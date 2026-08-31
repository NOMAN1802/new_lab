import { useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import { useRole } from '@/hooks/useRole';
import { apiErrorMessage, money } from '@/lib/format';
import { useGetTestCategoriesQuery } from '@/services/testCategoriesApi';
import {
    useCreateTestMutation,
    useDeleteTestMutation,
    useGetTestsQuery,
    useUpdateTestMutation,
} from '@/services/testsApi';
import type { LabTest, LabTestInput } from '@/services/testsApi';

const EMPTY: LabTestInput = {
    testCode: '',
    name: '',
    category: '',
    price: 0,
    sampleType: '',
    reportDeliveryDays: 1,
    isActive: true,
};

const fieldClass =
    'w-full rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

const TestsPage = () => {
    const { isAdmin } = useRole();
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<LabTest | null>(null);
    const [isFormOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<LabTestInput>(EMPTY);

    const { data, isLoading, isError, refetch } = useGetTestsQuery({
        search: search.trim() || undefined,
    });
    const { data: categoryData } = useGetTestCategoriesQuery();

    const [createTest, { isLoading: isCreating }] = useCreateTestMutation();
    const [updateTest, { isLoading: isUpdating }] = useUpdateTestMutation();
    const [deleteTest] = useDeleteTestMutation();

    const startCreate = () => {
        // Clearing `editing` matters: without it, opening the form after an
        // edit would submit an update instead of creating a new test.
        setEditing(null);
        setForm(EMPTY);
        setFormOpen(true);
    };

    const startEdit = (test: LabTest) => {
        const categoryId =
            typeof test.category === 'object' ? test.category?._id : test.category;

        setEditing(test);
        setForm({
            testCode: test.testCode,
            name: test.name,
            category: categoryId ?? '',
            price: test.price,
            sampleType: test.sampleType ?? '',
            reportDeliveryDays: test.reportDeliveryDays ?? 1,
            isActive: test.isActive,
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditing(null);
        setForm(EMPTY);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!form.testCode.trim() || !form.name.trim()) {
            toast.error('Test code and name are required');
            return;
        }
        if (form.price < 0) {
            toast.error('Price cannot be negative');
            return;
        }

        const payload: LabTestInput = {
            ...form,
            testCode: form.testCode.trim().toUpperCase(),
            name: form.name.trim(),
            category: form.category || undefined,
            sampleType: form.sampleType?.trim() || undefined,
        };

        try {
            if (editing) {
                await updateTest({ id: editing._id, data: payload }).unwrap();
                toast.success('Test updated');
            } else {
                await createTest(payload).unwrap();
                toast.success('Test added to the catalogue');
            }
            closeForm();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not save test'));
        }
    };

    const handleDelete = async (test: LabTest) => {
        if (!window.confirm(`Remove "${test.name}" from the catalogue?`)) return;
        try {
            await deleteTest(test._id).unwrap();
            toast.success('Test removed');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not remove test'));
        }
    };

    const tests = data?.items ?? [];
    const categories = categoryData?.items ?? [];
    const isSaving = isCreating || isUpdating;

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Test catalogue</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {tests.length} tests · prices apply to every new booking
                    </p>
                </div>
                {isAdmin && (
                    <button
                        type="button"
                        onClick={startCreate}
                        className="inline-flex items-center gap-2 rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
                    >
                        <PlusIcon className="h-5 w-5" />
                        Add test
                    </button>
                )}
            </header>

            <div className="relative max-w-md">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name or code"
                    className="w-full rounded-sm border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
            </div>

            {isFormOpen && isAdmin && (
                <form
                    onSubmit={handleSubmit}
                    className="space-y-5 rounded-sm border border-brand/20 bg-white/90 p-6 shadow-card shadow-slate-200/40 backdrop-blur"
                >
                    <h2 className="text-lg font-semibold text-slate-900">
                        {editing ? `Edit ${editing.name}` : 'New test'}
                    </h2>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Test code
                            </label>
                            <input
                                value={form.testCode}
                                onChange={(e) => setForm({ ...form, testCode: e.target.value })}
                                className={`${fieldClass} font-mono uppercase`}
                                placeholder="CBC"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Test name
                            </label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className={fieldClass}
                                placeholder="Complete Blood Count"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Department
                            </label>
                            <select
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                className={fieldClass}
                            >
                                <option value="">Unassigned</option>
                                {categories.map((category) => (
                                    <option key={category._id} value={category._id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Price (৳)
                            </label>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.price || ''}
                                onChange={(e) =>
                                    setForm({ ...form, price: Number(e.target.value) })
                                }
                                className={`${fieldClass} tabular-nums`}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Sample type <span className="text-slate-400">(optional)</span>
                            </label>
                            <input
                                value={form.sampleType}
                                onChange={(e) => setForm({ ...form, sampleType: e.target.value })}
                                className={fieldClass}
                                placeholder="Blood, Urine..."
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Report ready in (days)
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={form.reportDeliveryDays ?? ''}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        reportDeliveryDays: Number(e.target.value),
                                    })
                                }
                                className={`${fieldClass} tabular-nums`}
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
                        />
                        Available for booking
                    </label>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeForm}
                            className="rounded-sm border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-sm bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark disabled:opacity-60"
                        >
                            {isSaving ? 'Saving...' : editing ? 'Save changes' : 'Add test'}
                        </button>
                    </div>
                </form>
            )}

            {isLoading ? (
                <Loader message="Loading catalogue..." />
            ) : isError ? (
                <ErrorState title="Could not load the test catalogue" onRetry={refetch} />
            ) : tests.length === 0 ? (
                <div className="rounded-sm border border-dashed border-slate-200 bg-white/70 p-12 text-center">
                    <p className="text-sm font-medium text-slate-500">
                        {search ? `No tests match "${search}".` : 'The catalogue is empty.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-sm border border-white/60 bg-white/80 shadow-card shadow-slate-200/40 backdrop-blur">
                    <table className="w-full min-w-[44rem] text-left text-sm">
                        <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-5 py-4 font-semibold">Code</th>
                                <th className="px-5 py-4 font-semibold">Test</th>
                                <th className="px-5 py-4 font-semibold">Department</th>
                                <th className="px-5 py-4 font-semibold">Sample</th>
                                <th className="px-5 py-4 text-right font-semibold">Price</th>
                                {isAdmin && <th className="px-5 py-4 text-right font-semibold">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tests.map((test) => (
                                <tr
                                    key={test._id}
                                    className={`transition hover:bg-slate-50/70 ${
                                        test.isActive ? '' : 'opacity-50'
                                    }`}
                                >
                                    <td className="px-5 py-4 font-mono text-xs font-semibold text-brand">
                                        {test.testCode}
                                    </td>
                                    <td className="px-5 py-4 font-medium text-slate-900">
                                        {test.name}
                                        {!test.isActive && (
                                            <span className="ml-2 text-xs text-slate-400">(inactive)</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-slate-600">
                                        {test.categoryName ??
                                            (typeof test.category === 'object'
                                                ? test.category?.name
                                                : '—')}
                                    </td>
                                    <td className="px-5 py-4 text-slate-500">
                                        {test.sampleType || '—'}
                                    </td>
                                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-900">
                                        {money(test.price)}
                                    </td>
                                    {isAdmin && (
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-3 text-xs font-semibold">
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(test)}
                                                    className="text-brand transition hover:text-brand-dark"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(test)}
                                                    className="text-rose-500 transition hover:text-rose-600"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TestsPage;
