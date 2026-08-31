import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import { apiErrorMessage } from '@/lib/format';
import {
    useCreatePatientMutation,
    useGetPatientQuery,
    useUpdatePatientMutation,
} from '@/services/patientsApi';
import type { Gender, PatientInput } from '@/services/patientsApi';

const EMPTY: PatientInput = {
    name: '',
    age: 0,
    gender: 'male',
    phone: '',
    address: '',
};

const GENDERS: Gender[] = ['male', 'female', 'other'];

const fieldClass =
    'w-full rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

const PatientFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const { data: patient, isLoading, isError, refetch } = useGetPatientQuery(id!, {
        skip: !isEdit,
    });

    const [createPatient, { isLoading: isCreating }] = useCreatePatientMutation();
    const [updatePatient, { isLoading: isUpdating }] = useUpdatePatientMutation();

    const [form, setForm] = useState<PatientInput>(EMPTY);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loadedId, setLoadedId] = useState<string | null>(null);

    // Seed the form once the fetched patient arrives. Adjusting state during
    // render is React's documented alternative to syncing in an effect, and
    // avoids the extra render pass a useEffect would cause.
    if (patient && loadedId !== patient._id) {
        setLoadedId(patient._id);
        setForm({
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            phone: patient.phone,
            address: patient.address ?? '',
        });
    }

    const validate = () => {
        const next: Record<string, string> = {};
        if (!form.name.trim()) next.name = 'Name is required';
        if (!form.phone.trim()) next.phone = 'Phone number is required';
        if (!Number.isInteger(form.age) || form.age < 0 || form.age > 130) {
            next.age = 'Enter an age between 0 and 130';
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!validate()) return;

        const payload: PatientInput = {
            ...form,
            name: form.name.trim(),
            phone: form.phone.trim(),
            address: form.address?.trim() || undefined,
        };

        try {
            if (isEdit) {
                await updatePatient({ id: id!, data: payload }).unwrap();
                toast.success('Patient updated');
                navigate(`/patients/${id}`);
            } else {
                const created = await createPatient(payload).unwrap();
                toast.success(`Registered as ${created.patientId}`);
                navigate(`/billing/new?patient=${created._id}`);
            }
        } catch (error) {
            toast.error(
                apiErrorMessage(
                    error,
                    isEdit ? 'Could not update patient' : 'Could not register patient'
                )
            );
        }
    };

    if (isEdit && isLoading) return <Loader message="Loading patient..." />;
    if (isEdit && isError) {
        return (
            <ErrorState
                title="Could not load patient"
                description="This patient record is unavailable."
                onRetry={refetch}
            />
        );
    }

    const isSaving = isCreating || isUpdating;

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <header>
                <h1 className="text-2xl font-semibold text-slate-900">
                    {isEdit ? 'Edit patient' : 'Register patient'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    {isEdit
                        ? `Patient ID ${patient?.patientId} cannot be changed.`
                        : 'A patient ID is assigned automatically. You can book tests straight after saving.'}
                </p>
            </header>

            <form
                onSubmit={handleSubmit}
                className="space-y-5 rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur"
            >
                <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Full name
                    </label>
                    <input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className={fieldClass}
                        placeholder="e.g. Ayesha Rahman"
                    />
                    {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="age" className="mb-1.5 block text-sm font-medium text-slate-700">
                            Age
                        </label>
                        <input
                            id="age"
                            type="number"
                            min={0}
                            max={130}
                            value={form.age || ''}
                            onChange={(e) =>
                                setForm({ ...form, age: Number(e.target.value) })
                            }
                            className={fieldClass}
                        />
                        {errors.age && <p className="mt-1 text-xs text-rose-500">{errors.age}</p>}
                    </div>

                    <div>
                        <label htmlFor="gender" className="mb-1.5 block text-sm font-medium text-slate-700">
                            Sex
                        </label>
                        <select
                            id="gender"
                            value={form.gender}
                            onChange={(e) =>
                                setForm({ ...form, gender: e.target.value as Gender })
                            }
                            className={`${fieldClass} capitalize`}
                        >
                            {GENDERS.map((gender) => (
                                <option key={gender} value={gender} className="capitalize">
                                    {gender}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Phone
                    </label>
                    <input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className={fieldClass}
                        placeholder="01XXXXXXXXX"
                    />
                    {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
                </div>

                <div>
                    <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Address <span className="text-slate-400">(optional)</span>
                    </label>
                    <textarea
                        id="address"
                        rows={3}
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className={fieldClass}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="rounded-sm border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-sm bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark disabled:opacity-60"
                    >
                        {isSaving ? 'Saving...' : isEdit ? 'Save changes' : 'Register patient'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PatientFormPage;
