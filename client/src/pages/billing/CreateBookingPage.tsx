import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    MagnifyingGlassIcon,
    PlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import Loader from '@/components/common/Loader';
import { useRole } from '@/hooks/useRole';
import { apiErrorMessage, money } from '@/lib/format';
import { useCreateInvoiceMutation } from '@/services/invoicesApi';
import { useGetPatientsQuery } from '@/services/patientsApi';
import { useGetReferrersQuery } from '@/services/referrersApi';
import { useGetTestsQuery } from '@/services/testsApi';
import type { LabTest } from '@/services/testsApi';
import type { CommissionType } from '@/services/invoicesApi';

const fieldClass =
    'w-full rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const CreateBookingPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAdmin } = useRole();

    const [patientId, setPatientId] = useState(searchParams.get('patient') ?? '');
    const [patientSearch, setPatientSearch] = useState('');
    const [referrerId, setReferrerId] = useState('');
    const [selected, setSelected] = useState<LabTest[]>([]);
    const [testSearch, setTestSearch] = useState('');
    const [notes, setNotes] = useState('');
    // Blank means "use the referrer's standing terms".
    const [discountOverride, setDiscountOverride] = useState('');
    const [commissionType, setCommissionType] = useState<CommissionType | ''>('');
    const [commissionValue, setCommissionValue] = useState('');
    // Settling at the counter is the normal case, so this starts ticked.
    const [collectFullPayment, setCollectFullPayment] = useState(true);

    const { data: patientData, isLoading: loadingPatients } = useGetPatientsQuery({
        search: patientSearch.trim() || undefined,
        limit: 30,
    });
    const { data: referrerData } = useGetReferrersQuery({ limit: 200 });
    const { data: testData, isLoading: loadingTests } = useGetTestsQuery({
        search: testSearch.trim() || undefined,
        limit: 200,
    });

    const [createInvoice, { isLoading: isSubmitting }] = useCreateInvoiceMutation();

    const patients = patientData?.items ?? [];
    const referrers = (referrerData?.items ?? []).filter((r) => r.isActive);
    const tests = (testData?.items ?? []).filter((t) => t.isActive);

    const patient = patients.find((p) => p._id === patientId);
    const referrer = referrers.find((r) => r._id === referrerId);

    /**
     * Preview only — the server recomputes every figure from the catalogue on
     * submit, so a mismatch here can never change what the patient is billed.
     */
    const totals = (() => {
        const gross = round2(selected.reduce((sum, test) => sum + test.price, 0));

        // The discount comes off the patient's bill. It defaults from the
        // referrer, but can be given to a walk-in too.
        const discountPercent =
            discountOverride !== ''
                ? Number(discountOverride)
                : (referrer?.defaultDiscountPercent ?? 0);

        const discount = round2((gross * discountPercent) / 100);
        const net = round2(gross - discount);

        // Commission is a separate arrangement with the referring doctor and
        // never touches the patient's bill. No referrer, nobody to pay.
        const type = commissionType || referrer?.defaultCommissionType || 'percent';
        const value =
            commissionValue !== ''
                ? Number(commissionValue)
                : (referrer?.defaultCommissionValue ?? 0);

        const commission = !referrer
            ? 0
            : type === 'fixed'
              ? round2(value)
              : round2((net * value) / 100);

        return { gross, discountPercent, discount, net, commissionType: type, commission };
    })();

    const addTest = (test: LabTest) => {
        setSelected((current) => [...current, test]);
    };

    const removeTest = (index: number) => {
        setSelected((current) => current.filter((_, i) => i !== index));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!patientId) {
            toast.error('Select a patient first');
            return;
        }
        if (selected.length === 0) {
            toast.error('Add at least one test');
            return;
        }

        try {
            const invoice = await createInvoice({
                patient: patientId,
                referrer: referrerId || undefined,
                testIds: selected.map((test) => test._id),
                notes: notes.trim() || undefined,
                collectFullPayment,
                // Blank fields are omitted so the server falls back to the
                // referrer's standing terms.
                discountPercent:
                    discountOverride !== '' ? Number(discountOverride) : undefined,
                commissionType: commissionType || undefined,
                commissionValue:
                    commissionValue !== '' ? Number(commissionValue) : undefined,
            }).unwrap();

            toast.success(
                invoice.paymentStatus === 'paid'
                    ? `Invoice ${invoice.invoiceNumber} created and paid in full`
                    : `Invoice ${invoice.invoiceNumber} created`
            );
            navigate(`/billing/${invoice._id}`);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not create the invoice'));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <header>
                <h1 className="text-2xl font-semibold text-slate-900">New booking</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Select the patient, add tests, and the invoice is generated on save.
                </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div className="space-y-6">
                    <section className="rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                        <h2 className="mb-4 text-lg font-semibold text-slate-900">Patient</h2>

                        <div className="relative mb-3">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={patientSearch}
                                onChange={(e) => setPatientSearch(e.target.value)}
                                placeholder="Search by name, phone or patient ID"
                                className={`${fieldClass} pl-12`}
                            />
                        </div>

                        {loadingPatients ? (
                            <Loader message="Loading patients..." />
                        ) : (
                            <select
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                                className={fieldClass}
                                size={1}
                            >
                                <option value="">Select a patient</option>
                                {patients.map((option) => (
                                    <option key={option._id} value={option._id}>
                                        {option.patientId} · {option.name} · {option.phone}
                                    </option>
                                ))}
                            </select>
                        )}

                        {patient && (
                            <p className="mt-3 rounded-sm bg-brand/5 px-4 py-3 text-sm capitalize text-slate-600">
                                <strong className="text-slate-900">{patient.name}</strong> ·{' '}
                                {patient.age} yrs · {patient.gender} · {patient.phone}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={() => navigate('/patients/new')}
                            className="mt-3 text-sm font-semibold text-brand transition hover:text-brand-dark"
                        >
                            + Register a new patient
                        </button>
                    </section>

                    <section className="rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                        <h2 className="mb-4 text-lg font-semibold text-slate-900">
                            Referred by <span className="text-sm font-normal text-slate-400">(optional)</span>
                        </h2>
                        <select
                            value={referrerId}
                            onChange={(e) => {
                                setReferrerId(e.target.value);
                                // Fall back to the new referrer's own terms.
                                setDiscountOverride('');
                                setCommissionType('');
                                setCommissionValue('');
                            }}
                            className={fieldClass}
                        >
                            <option value="">Walk-in — no referrer</option>
                            {referrers.map((option) => (
                                <option key={option._id} value={option._id}>
                                    {option.referrerCode} · {option.name}
                                    {option.hospital ? ` · ${option.hospital}` : ''}
                                </option>
                            ))}
                        </select>

                        <div className="mt-4">
                            <label
                                htmlFor="discount"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Patient discount (%)
                            </label>
                            <input
                                id="discount"
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={discountOverride}
                                onChange={(e) => setDiscountOverride(e.target.value)}
                                placeholder={
                                    referrer
                                        ? `Default ${referrer.defaultDiscountPercent ?? 0}%`
                                        : '0'
                                }
                                className={`${fieldClass} tabular-nums`}
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Comes off what the patient pays. Leave blank to use the
                                referrer&apos;s standing rate.
                            </p>
                        </div>

                        {isAdmin && referrer && (
                            <div className="mt-5 space-y-3 rounded-sm bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-900">
                                    Commission to {referrer.name}
                                </p>

                                <div className="flex gap-1 rounded-sm bg-white p-1">
                                    {(
                                        [
                                            ['percent', '% of paid amount'],
                                            ['fixed', 'Fixed amount (৳)'],
                                        ] as [CommissionType, string][]
                                    ).map(([value, label]) => {
                                        const active =
                                            (commissionType ||
                                                referrer.defaultCommissionType ||
                                                'percent') === value;
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setCommissionType(value)}
                                                className={`flex-1 rounded-sm px-3 py-1.5 text-xs font-semibold transition ${
                                                    active
                                                        ? 'bg-brand text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={commissionValue}
                                    onChange={(e) => setCommissionValue(e.target.value)}
                                    placeholder={`Default ${referrer.defaultCommissionValue ?? 0}${
                                        (referrer.defaultCommissionType ?? 'percent') ===
                                        'fixed'
                                            ? ' ৳'
                                            : '%'
                                    }`}
                                    className={`${fieldClass} tabular-nums`}
                                />

                                <p className="text-xs text-slate-500">
                                    Paid by the centre to the referrer — it does not change the
                                    patient&apos;s bill. Leave blank to use their standing terms.
                                </p>
                            </div>
                        )}
                    </section>

                    <section className="rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                        <h2 className="mb-4 text-lg font-semibold text-slate-900">Tests</h2>

                        <div className="relative mb-4">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={testSearch}
                                onChange={(e) => setTestSearch(e.target.value)}
                                placeholder="Search tests by name or code"
                                className={`${fieldClass} pl-12`}
                            />
                        </div>

                        {loadingTests ? (
                            <Loader message="Loading catalogue..." />
                        ) : (
                            <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
                                {tests.map((test) => (
                                    <li key={test._id}>
                                        <button
                                            type="button"
                                            onClick={() => addTest(test)}
                                            className="flex w-full items-center justify-between gap-3 rounded-sm px-4 py-2.5 text-left text-sm transition hover:bg-brand/5"
                                        >
                                            <span>
                                                <span className="font-mono text-xs font-semibold text-brand">
                                                    {test.testCode}
                                                </span>{' '}
                                                <span className="text-slate-700">{test.name}</span>
                                            </span>
                                            <span className="flex items-center gap-3">
                                                <span className="tabular-nums text-slate-600">
                                                    {money(test.price)}
                                                </span>
                                                <PlusIcon className="h-4 w-4 text-brand" />
                                            </span>
                                        </button>
                                    </li>
                                ))}
                                {tests.length === 0 && (
                                    <li className="px-4 py-6 text-center text-sm text-slate-500">
                                        No tests match that search.
                                    </li>
                                )}
                            </ul>
                        )}
                    </section>
                </div>

                <aside className="lg:sticky lg:top-6 lg:self-start">
                    <div className="space-y-4 rounded-sm border border-white/60 bg-white/80 p-6 shadow-card shadow-slate-200/40 backdrop-blur">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Selected tests ({selected.length})
                        </h2>

                        {selected.length === 0 ? (
                            <p className="rounded-sm border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                                No tests added yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {selected.map((test, index) => (
                                    <li
                                        key={`${test._id}-${index}`}
                                        className="flex items-center justify-between gap-3 rounded-sm bg-slate-50 px-4 py-2.5 text-sm"
                                    >
                                        <span className="text-slate-700">{test.name}</span>
                                        <span className="flex items-center gap-3">
                                            <span className="tabular-nums text-slate-900">
                                                {money(test.price)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeTest(index)}
                                                aria-label={`Remove ${test.name}`}
                                                className="text-rose-400 transition hover:text-rose-600"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <dl className="space-y-2 border-t border-slate-100 pt-4 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Gross</dt>
                                <dd className="tabular-nums text-slate-900">{money(totals.gross)}</dd>
                            </div>
                            {totals.discount > 0 && (
                                <div className="flex justify-between text-amber-600">
                                    <dt>Discount ({totals.discountPercent}%)</dt>
                                    <dd className="tabular-nums">−{money(totals.discount)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold">
                                <dt className="text-slate-900">Patient pays</dt>
                                <dd className="tabular-nums text-brand">{money(totals.net)}</dd>
                            </div>

                            {/* Below the line: the centre's cost, not the patient's bill. */}
                            {isAdmin && referrer && totals.commission > 0 && (
                                <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-xs text-slate-500">
                                    <dt>
                                        Commission to {referrer.name.split(' ').slice(-1)[0]}
                                        {totals.commissionType === 'percent'
                                            ? ' (% of paid)'
                                            : ' (fixed)'}
                                    </dt>
                                    <dd className="tabular-nums">{money(totals.commission)}</dd>
                                </div>
                            )}
                        </dl>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Notes <span className="text-slate-400">(optional)</span>
                            </label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className={fieldClass}
                            />
                        </div>

                        <label
                            className={`flex cursor-pointer items-start gap-3 rounded-sm border px-4 py-3 transition ${
                                collectFullPayment
                                    ? 'border-emerald-200 bg-emerald-50/70'
                                    : 'border-slate-200 bg-white'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={collectFullPayment}
                                onChange={(e) => setCollectFullPayment(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
                            />
                            <span className="text-sm">
                                <span className="font-semibold text-slate-900">
                                    Collect full payment now
                                </span>
                                <span className="mt-0.5 block text-xs text-slate-500">
                                    {collectFullPayment
                                        ? `Takes ${money(totals.net)} in cash and issues a receipt with the invoice.`
                                        : 'The invoice will be left unpaid — collect on the invoice later.'}
                                </span>
                            </span>
                        </label>

                        <button
                            type="submit"
                            disabled={isSubmitting || selected.length === 0 || !patientId}
                            className="w-full rounded-sm bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark disabled:opacity-50"
                        >
                            {isSubmitting
                                ? 'Creating invoice...'
                                : collectFullPayment
                                  ? 'Create invoice & take payment'
                                  : 'Create invoice'}
                        </button>

                        <p className="text-center text-xs text-slate-400">
                            Partial payments can be recorded on the invoice at any time.
                        </p>
                    </div>
                </aside>
            </div>
        </form>
    );
};

export default CreateBookingPage;
