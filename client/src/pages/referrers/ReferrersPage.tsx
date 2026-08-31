import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import { apiErrorMessage, percent } from '@/lib/format';
import {
    useCreateReferrerMutation,
    useDeleteReferrerMutation,
    useGetReferrersQuery,
    useUpdateReferrerMutation,
} from '@/services/referrersApi';
import type { Referrer, ReferrerInput } from '@/services/referrersApi';

const EMPTY: ReferrerInput = {
    referrerCode: '',
    name: '',
    designation: '',
    hospital: '',
    phone: '',
    address: '',
    defaultWaiverPercent: 0,
    defaultCommissionPercent: 0,
    isActive: true,
};

const fieldClass =
    'w-full rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

const ReferrersPage = () => {
    const [search, setSearch] = useState('');
    const [isFormOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Referrer | null>(null);
    const [form, setForm] = useState<ReferrerInput>(EMPTY);

    const { data, isLoading, isError, refetch } = useGetReferrersQuery({
        search: search.trim() || undefined,
    });
    const [createReferrer, { isLoading: isCreating }] = useCreateReferrerMutation();
    const [updateReferrer, { isLoading: isUpdating }] = useUpdateReferrerMutation();
    const [deleteReferrer] = useDeleteReferrerMutation();

    const startCreate = () => {
        // Clearing `editing` matters: without it, opening the form after an
        // edit would submit an update instead of creating a new referrer.
        setEditing(null);
        setForm(EMPTY);
        setFormOpen(true);
    };

    const startEdit = (referrer: Referrer) => {
        setEditing(referrer);
        setForm({
            referrerCode: referrer.referrerCode,
            name: referrer.name,
            designation: referrer.designation ?? '',
            hospital: referrer.hospital ?? '',
            phone: referrer.phone,
            address: referrer.address ?? '',
            defaultWaiverPercent: referrer.defaultWaiverPercent ?? 0,
            defaultCommissionPercent: referrer.defaultCommissionPercent ?? 0,
            isActive: referrer.isActive,
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

        if (!form.referrerCode.trim() || !form.name.trim() || !form.phone.trim()) {
            toast.error('Code, name and phone are required');
            return;
        }

        const payload: ReferrerInput = {
            ...form,
            referrerCode: form.referrerCode.trim().toUpperCase(),
            name: form.name.trim(),
            phone: form.phone.trim(),
            designation: form.designation?.trim() || undefined,
            hospital: form.hospital?.trim() || undefined,
            address: form.address?.trim() || undefined,
        };

        try {
            if (editing) {
                await updateReferrer({ id: editing._id, data: payload }).unwrap();
                toast.success('Referrer updated. Existing invoices keep their original rates.');
            } else {
                await createReferrer(payload).unwrap();
                toast.success('Referrer added');
            }
            closeForm();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not save referrer'));
        }
    };

    const handleDelete = async (referrer: Referrer) => {
        if (
            !window.confirm(
                `Deactivate ${referrer.name}? Past invoices and any unpaid commission stay on record.`
            )
        ) {
            return;
        }
        try {
            await deleteReferrer(referrer._id).unwrap();
            toast.success('Referrer deactivated');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not deactivate referrer'));
        }
    };

    const referrers = data?.items ?? [];
    const isSaving = isCreating || isUpdating;

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Referrers (RFE)</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Default rates pre-fill at booking and are frozen onto each invoice.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={startCreate}
                    className="inline-flex items-center gap-2 rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
                >
                    <PlusIcon className="h-5 w-5" />
                    Add referrer
                </button>
            </header>

            <div className="relative max-w-md">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name, code or hospital"
                    className="w-full rounded-sm border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
            </div>

            {isFormOpen && (
                <form
                    onSubmit={handleSubmit}
                    className="space-y-5 rounded-sm border border-brand/20 bg-white/90 p-6 shadow-card shadow-slate-200/40 backdrop-blur"
                >
                    <h2 className="text-lg font-semibold text-slate-900">
                        {editing ? `Edit ${editing.name}` : 'New referrer'}
                    </h2>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Code</label>
                            <input
                                value={form.referrerCode}
                                onChange={(e) => setForm({ ...form, referrerCode: e.target.value })}
                                className={`${fieldClass} font-mono uppercase`}
                                placeholder="RFE-001"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className={fieldClass}
                                placeholder="Dr. Rakesh Shaha"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Designation
                            </label>
                            <input
                                value={form.designation}
                                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                                className={fieldClass}
                                placeholder="MBBS, FCPS"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Hospital / clinic
                            </label>
                            <input
                                value={form.hospital}
                                onChange={(e) => setForm({ ...form, hospital: e.target.value })}
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
                            <input
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className={fieldClass}
                                placeholder="01XXXXXXXXX"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
                            <input
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                className={fieldClass}
                            />
                        </div>
                    </div>

                    <div className="grid gap-5 rounded-sm bg-amber-50/60 p-5 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Default patient waiver (%)
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={form.defaultWaiverPercent ?? 0}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        defaultWaiverPercent: Number(e.target.value),
                                    })
                                }
                                className={`${fieldClass} tabular-nums`}
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Discount taken off the patient&apos;s gross bill.
                            </p>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Default commission (%)
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={form.defaultCommissionPercent ?? 0}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        defaultCommissionPercent: Number(e.target.value),
                                    })
                                }
                                className={`${fieldClass} tabular-nums`}
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Earned on net payable, after the waiver.
                            </p>
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
                        />
                        Available to select at booking
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
                            {isSaving ? 'Saving...' : editing ? 'Save changes' : 'Add referrer'}
                        </button>
                    </div>
                </form>
            )}

            {isLoading ? (
                <Loader message="Loading referrers..." />
            ) : isError ? (
                <ErrorState title="Could not load referrers" onRetry={refetch} />
            ) : referrers.length === 0 ? (
                <div className="rounded-sm border border-dashed border-slate-200 bg-white/70 p-12 text-center">
                    <p className="text-sm font-medium text-slate-500">
                        {search ? `No referrers match "${search}".` : 'No referrers added yet.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-sm border border-white/60 bg-white/80 shadow-card shadow-slate-200/40 backdrop-blur">
                    <table className="w-full min-w-[48rem] text-left text-sm">
                        <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-5 py-4 font-semibold">Code</th>
                                <th className="px-5 py-4 font-semibold">Referrer</th>
                                <th className="px-5 py-4 font-semibold">Hospital</th>
                                <th className="px-5 py-4 font-semibold">Phone</th>
                                <th className="px-5 py-4 text-right font-semibold">Waiver</th>
                                <th className="px-5 py-4 text-right font-semibold">Commission</th>
                                <th className="px-5 py-4 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {referrers.map((referrer) => (
                                <tr
                                    key={referrer._id}
                                    className={`transition hover:bg-slate-50/70 ${
                                        referrer.isActive ? '' : 'opacity-50'
                                    }`}
                                >
                                    <td className="px-5 py-4 font-mono text-xs font-semibold text-brand">
                                        {referrer.referrerCode}
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="font-medium text-slate-900">{referrer.name}</p>
                                        {referrer.designation && (
                                            <p className="text-xs text-slate-500">{referrer.designation}</p>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-slate-600">{referrer.hospital || '—'}</td>
                                    <td className="px-5 py-4 tabular-nums text-slate-600">{referrer.phone}</td>
                                    <td className="px-5 py-4 text-right tabular-nums text-amber-600">
                                        {percent(referrer.defaultWaiverPercent)}
                                    </td>
                                    <td className="px-5 py-4 text-right tabular-nums text-slate-900">
                                        {percent(referrer.defaultCommissionPercent)}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-3 text-xs font-semibold">
                                            <Link
                                                to={`/commission?referrer=${referrer._id}`}
                                                className="text-emerald-600 transition hover:text-emerald-700"
                                            >
                                                Commission
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => startEdit(referrer)}
                                                className="text-brand transition hover:text-brand-dark"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(referrer)}
                                                className="text-rose-500 transition hover:text-rose-600"
                                            >
                                                Deactivate
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ReferrersPage;
