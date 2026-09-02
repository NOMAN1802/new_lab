import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import Loader from '@/components/common/Loader';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Icon from '@/components/ui/Icon';
import Panel from '@/components/ui/Panel';
import SegmentedControl from '@/components/ui/SegmentedControl';
import Select from '@/components/ui/Select';
import TextField from '@/components/ui/TextField';
import Textarea from '@/components/ui/Textarea';
import { useRole } from '@/hooks/useRole';
import { apiErrorMessage, money } from '@/lib/format';
import { useCreateInvoiceMutation } from '@/services/invoicesApi';
import { useGetPatientsQuery } from '@/services/patientsApi';
import { useGetReferrersQuery } from '@/services/referrersApi';
import { useGetTestsQuery } from '@/services/testsApi';
import type { LabTest } from '@/services/testsApi';
import type { CommissionType } from '@/services/invoicesApi';

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const testRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    padding: '9px 12px',
    border: 0,
    background: 'transparent',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    textAlign: 'left',
};

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
        const discountPercent = discountOverride !== '' ? Number(discountOverride) : (referrer?.defaultDiscountPercent ?? 0);

        const discount = round2((gross * discountPercent) / 100);
        const net = round2(gross - discount);

        // Commission is a separate arrangement with the referring doctor and
        // never touches the patient's bill. No referrer, nobody to pay.
        const type = commissionType || referrer?.defaultCommissionType || 'percent';
        const value = commissionValue !== '' ? Number(commissionValue) : (referrer?.defaultCommissionValue ?? 0);

        const commission = !referrer ? 0 : type === 'fixed' ? round2(value) : round2((net * value) / 100);

        return { gross, discountPercent, discount, net, commissionType: type, commission };
    })();

    const addTest = (test: LabTest) => setSelected((current) => [...current, test]);
    const removeTest = (index: number) => setSelected((current) => current.filter((_, i) => i !== index));

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
                discountPercent: discountOverride !== '' ? Number(discountOverride) : undefined,
                commissionType: commissionType || undefined,
                commissionValue: commissionValue !== '' ? Number(commissionValue) : undefined,
            }).unwrap();

            toast.success(
                invoice.paymentStatus === 'paid'
                    ? `Invoice ${invoice.invoiceNumber} created and paid in full`
                    : `Invoice ${invoice.invoiceNumber} created`,
            );
            navigate(`/billing/${invoice._id}`);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Could not create the invoice'));
        }
    };

    const activeCommissionType = commissionType || referrer?.defaultCommissionType || 'percent';

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-grid)' }}>
            <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>New booking</h2>
                <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>
                    Select the patient, add tests, and the invoice is generated on save.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px,1fr))', gap: 'var(--gap-grid)', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-grid)' }}>
                    <Panel title="Patient">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <TextField
                                icon="search"
                                type="search"
                                value={patientSearch}
                                onChange={(e) => setPatientSearch(e.target.value)}
                                placeholder="Search by name, phone or patient ID"
                            />

                            {loadingPatients ? (
                                <Loader message="Loading patients..." />
                            ) : (
                                <Select
                                    value={patientId}
                                    onChange={(e) => setPatientId(e.target.value)}
                                    placeholder="Select a patient"
                                    options={patients.map((option) => ({
                                        label: `${option.patientId} · ${option.name} · ${option.phone}`,
                                        value: option._id,
                                    }))}
                                />
                            )}

                            {patient && (
                                <p
                                    style={{
                                        background: 'var(--brand-tint)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '10px 14px',
                                        fontSize: 13,
                                        color: 'var(--text-body)',
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    <strong style={{ color: 'var(--text-heading)' }}>{patient.name}</strong> · {patient.age} yrs · {patient.gender} ·{' '}
                                    {patient.phone}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={() => navigate('/patients/new')}
                                style={{
                                    alignSelf: 'flex-start',
                                    border: 0,
                                    background: 'transparent',
                                    padding: 0,
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: 'var(--brand)',
                                }}
                            >
                                + Register a new patient
                            </button>
                        </div>
                    </Panel>

                    <Panel title="Referred by" subtitle="Optional — a walk-in accrues no commission">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <Select
                                value={referrerId}
                                onChange={(e) => {
                                    setReferrerId(e.target.value);
                                    // Fall back to the new referrer's own terms.
                                    setDiscountOverride('');
                                    setCommissionType('');
                                    setCommissionValue('');
                                }}
                                placeholder="Walk-in — no referrer"
                                options={referrers.map((option) => ({
                                    label: `${option.referrerCode} · ${option.name}${option.hospital ? ` · ${option.hospital}` : ''}`,
                                    value: option._id,
                                }))}
                            />

                            <TextField
                                label="Patient discount (%)"
                                id="discount"
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={discountOverride}
                                onChange={(e) => setDiscountOverride(e.target.value)}
                                placeholder={referrer ? `Default ${referrer.defaultDiscountPercent ?? 0}%` : '0'}
                                hint="Comes off what the patient pays. Leave blank to use the referrer's standing rate."
                            />

                            {isAdmin && referrer && (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12,
                                        background: 'var(--surface-sunken)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: 'var(--space-4)',
                                    }}
                                >
                                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)' }}>Commission to {referrer.name}</p>

                                    <SegmentedControl
                                        options={[
                                            { label: '% of paid amount', value: 'percent' },
                                            { label: 'Fixed amount (৳)', value: 'fixed' },
                                        ]}
                                        value={activeCommissionType}
                                        onChange={(value) => setCommissionType(value as CommissionType)}
                                    />

                                    <TextField
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={commissionValue}
                                        onChange={(e) => setCommissionValue(e.target.value)}
                                        placeholder={`Default ${referrer.defaultCommissionValue ?? 0}${
                                            (referrer.defaultCommissionType ?? 'percent') === 'fixed' ? ' ৳' : '%'
                                        }`}
                                        hint="Paid by the centre to the referrer — it does not change the patient's bill. Leave blank to use their standing terms."
                                    />
                                </div>
                            )}
                        </div>
                    </Panel>

                    <Panel title="Tests">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <TextField
                                icon="search"
                                type="search"
                                value={testSearch}
                                onChange={(e) => setTestSearch(e.target.value)}
                                placeholder="Search tests by name or code"
                            />

                            {loadingTests ? (
                                <Loader message="Loading catalogue..." />
                            ) : (
                                <ul
                                    style={{
                                        listStyle: 'none',
                                        margin: 0,
                                        padding: 0,
                                        maxHeight: 260,
                                        overflowY: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                    }}
                                >
                                    {tests.map((test) => (
                                        <li key={test._id}>
                                            <button
                                                type="button"
                                                onClick={() => addTest(test)}
                                                style={testRow}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--brand-tint)')}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <span>
                                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--brand)' }}>
                                                        {test.testCode}
                                                    </span>{' '}
                                                    <span style={{ color: 'var(--text-body)' }}>{test.name}</span>
                                                </span>
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                        color: 'var(--text-muted)',
                                                        fontVariantNumeric: 'tabular-nums',
                                                    }}
                                                >
                                                    {money(test.price)}
                                                    <Icon name="plus" size={15} color="var(--brand)" />
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                    {tests.length === 0 && (
                                        <li style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                                            No tests match that search.
                                        </li>
                                    )}
                                </ul>
                            )}
                        </div>
                    </Panel>
                </div>

                <Panel title={`Selected tests (${selected.length})`} style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 16px)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {selected.length === 0 ? (
                            <p
                                style={{
                                    border: '1px dashed var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 28,
                                    textAlign: 'center',
                                    fontSize: 13,
                                    color: 'var(--text-muted)',
                                }}
                            >
                                No tests added yet.
                            </p>
                        ) : (
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {selected.map((test, index) => (
                                    <li
                                        key={`${test._id}-${index}`}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                            background: 'var(--surface-sunken)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '10px 14px',
                                            fontSize: 13,
                                        }}
                                    >
                                        <span style={{ color: 'var(--text-body)' }}>{test.name}</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ color: 'var(--text-heading)', fontVariantNumeric: 'tabular-nums' }}>{money(test.price)}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeTest(index)}
                                                aria-label={`Remove ${test.name}`}
                                                style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}
                                            >
                                                <Icon name="trash-2" size={15} />
                                            </button>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <dl
                            style={{
                                margin: 0,
                                borderTop: '1px solid var(--surface-muted)',
                                paddingTop: 14,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                fontSize: 13,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <dt style={{ color: 'var(--text-muted)' }}>Gross</dt>
                                <dd style={{ margin: 0, color: 'var(--text-heading)', fontVariantNumeric: 'tabular-nums' }}>{money(totals.gross)}</dd>
                            </div>
                            {totals.discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning-strong)' }}>
                                    <dt>Discount ({totals.discountPercent}%)</dt>
                                    <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>−{money(totals.discount)}</dd>
                                </div>
                            )}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    borderTop: '1px solid var(--surface-muted)',
                                    paddingTop: 10,
                                    fontSize: 16,
                                    fontWeight: 700,
                                }}
                            >
                                <dt style={{ color: 'var(--text-heading)' }}>Patient pays</dt>
                                <dd style={{ margin: 0, color: 'var(--brand)', fontVariantNumeric: 'tabular-nums' }}>{money(totals.net)}</dd>
                            </div>

                            {/* Below the line: the centre's cost, not the patient's bill. */}
                            {isAdmin && referrer && totals.commission > 0 && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderTop: '1px dashed var(--border-subtle)',
                                        paddingTop: 10,
                                        fontSize: 12,
                                        color: 'var(--text-muted)',
                                    }}
                                >
                                    <dt>
                                        Commission to {referrer.name.split(' ').slice(-1)[0]}
                                        {totals.commissionType === 'percent' ? ' (% of paid)' : ' (fixed)'}
                                    </dt>
                                    <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{money(totals.commission)}</dd>
                                </div>
                            )}
                        </dl>

                        <Textarea label="Notes" optional rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

                        <Checkbox
                            card
                            checked={collectFullPayment}
                            onChange={(e) => setCollectFullPayment(e.target.checked)}
                            label="Collect full payment now"
                            description={
                                collectFullPayment
                                    ? `Takes ${money(totals.net)} in cash and issues a receipt with the invoice.`
                                    : 'The invoice will be left unpaid — collect on the invoice later.'
                            }
                        />

                        <Button type="submit" block size="lg" loading={isSubmitting} disabled={selected.length === 0 || !patientId}>
                            {isSubmitting ? 'Creating invoice...' : collectFullPayment ? 'Create invoice & take payment' : 'Create invoice'}
                        </Button>

                        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>
                            Partial payments can be recorded on the invoice at any time.
                        </p>
                    </div>
                </Panel>
            </div>
        </form>
    );
};

export default CreateBookingPage;
