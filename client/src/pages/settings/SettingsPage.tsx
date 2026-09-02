import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import InlineAlert from '@/components/ui/InlineAlert';
import PageHero from '@/components/ui/PageHero';
import Panel from '@/components/ui/Panel';
import TextField from '@/components/ui/TextField';
import { CENTRE } from '@/lib/centre';
import { apiErrorMessage } from '@/lib/format';
import { useGetCurrentUserQuery, useUpdateCurrentUserMutation } from '@/services/userApi';
import type { UpdateUserInput } from '@/services/userApi';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { logout } from '@/features/auth/authSlice';

/** Label with a small brand-tinted glyph, as the design system's forms use. */
const legend = (icon: IconName, text: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={15} color="var(--brand)" />
        {text}
    </span>
);

const SettingsPage = () => {
    const { accessToken, initializing } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { data: user, isLoading, isError, refetch } = useGetCurrentUserQuery(undefined, {
        skip: !accessToken || initializing,
    });
    const [updateUser, { isLoading: isUpdating }] = useUpdateCurrentUserMutation();

    const [formData, setFormData] = useState({ name: '', email: '', mobileNumber: '', password: '' });
    const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const prevUserIdRef = useRef<string | undefined>(undefined);

    // Seed the form the first time this user's record arrives.
    useEffect(() => {
        if (!user || prevUserIdRef.current === user._id) return;

        prevUserIdRef.current = user._id;
        queueMicrotask(() => {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                mobileNumber: user.mobileNumber || '',
                password: '',
            });
        });
    }, [user]);

    if (isLoading) return <Loader fullScreen message="Loading settings..." />;

    if (isError || !user) {
        return <ErrorState title="Unable to load settings" description="Check your network or try refreshing the page." onRetry={refetch} />;
    }

    const dirty =
        formData.name !== user.name ||
        formData.email !== user.email ||
        formData.mobileNumber !== user.mobileNumber ||
        formData.password.trim() !== '';

    const handleChange = (field: keyof typeof formData) => (event: { target: { value: string } }) => {
        setFormData((current) => ({ ...current, [field]: event.target.value }));
        setResult(null);
    };

    const handleSave = async () => {
        setResult(null);

        const payload: UpdateUserInput = {};
        const passwordChanged = formData.password.trim() !== '';

        if (formData.name !== user.name) payload.name = formData.name;
        if (formData.email !== user.email) payload.email = formData.email;
        if (formData.mobileNumber !== user.mobileNumber) payload.mobileNumber = formData.mobileNumber;
        if (passwordChanged) payload.password = formData.password;

        if (Object.keys(payload).length === 0) {
            setResult({ tone: 'error', text: 'No changes to save.' });
            return;
        }

        try {
            await updateUser(payload).unwrap();

            // A password change invalidates the session everywhere, so sign out.
            if (passwordChanged) {
                setResult({
                    tone: 'success',
                    text: 'Password changed. You will be signed out shortly — sign in again with the new password.',
                });
                setTimeout(() => {
                    dispatch(logout());
                    navigate('/login', {
                        state: { message: 'Password changed successfully. Please login with your new password.' },
                    });
                }, 1500);
            } else {
                setResult({ tone: 'success', text: 'Profile updated.' });
                refetch();
                setFormData((current) => ({ ...current, password: '' }));
                setTimeout(() => setResult(null), 3000);
            }
        } catch (error) {
            setResult({ tone: 'error', text: apiErrorMessage(error, 'Failed to update profile. Please try again.') });
        }
    };

    const handleReset = () => {
        setFormData({
            name: user.name,
            email: user.email,
            mobileNumber: user.mobileNumber,
            password: '',
        });
        setResult(null);
    };

    const accountFacts: [string, string, IconName][] = [
        ['Role', user.role, 'shield-check'],
        ['Centre', CENTRE.name, 'building-2'],
        ['Time zone', 'Asia/Dhaka (GMT+6)', 'globe'],
        ['Member since', user.createdAt ? dayjs(user.createdAt).format('D MMM YYYY') : '—', 'calendar'],
    ];

    return (
        <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 'var(--gap-grid)' }}>
            <PageHero
                eyebrow="Configuration"
                title="Account settings"
                description="Update your account information and security preferences."
            />

            <Panel title="Personal information" subtitle="Your sign-in details. Role and permissions are set by an administrator.">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {result && (
                        <InlineAlert tone={result.tone} onDismiss={() => setResult(null)}>
                            {result.text}
                        </InlineAlert>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: 20 }}>
                        <TextField label={legend('user-round', 'Full name')} value={formData.name} onChange={handleChange('name')} placeholder="Enter your name" />
                        <TextField
                            label={legend('phone', 'Mobile number')}
                            type="tel"
                            value={formData.mobileNumber}
                            onChange={handleChange('mobileNumber')}
                            placeholder="01XXXXXXXXX"
                        />
                    </div>

                    <TextField
                        label={legend('mail', 'Email address')}
                        type="email"
                        value={formData.email}
                        onChange={handleChange('email')}
                        placeholder="you@example.com"
                    />

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
                        <TextField
                            label={legend('key-round', 'New password')}
                            type="password"
                            value={formData.password}
                            onChange={handleChange('password')}
                            placeholder="Leave blank to keep your current password"
                            hint="At least 8 characters. Changing it signs you out of every device."
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 20, flexWrap: 'wrap' }}>
                        <Button icon="check" loading={isUpdating} onClick={handleSave}>
                            {isUpdating ? 'Saving...' : 'Save changes'}
                        </Button>
                        <Button variant="secondary" icon="x" disabled={isUpdating || !dirty} onClick={handleReset}>
                            Reset
                        </Button>
                        {!dirty && !result && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Nothing changed yet.</span>}
                    </div>
                </div>
            </Panel>

            <Panel title="Account" subtitle="Managed by an administrator — contact one to change these.">
                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
                    {accountFacts.map(([label, value, icon]) => (
                        <div
                            key={label}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                background: 'var(--surface-sunken)',
                                borderRadius: 'var(--radius-md)',
                                padding: '12px 16px',
                            }}
                        >
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 32,
                                    height: 32,
                                    borderRadius: 9,
                                    background: 'var(--brand-light)',
                                    color: 'var(--brand-dark)',
                                    flex: '0 0 auto',
                                }}
                            >
                                <Icon name={icon} size={16} />
                            </span>
                            <div>
                                <dt
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        letterSpacing: 'var(--tracking-caps)',
                                        textTransform: 'uppercase',
                                        color: 'var(--text-faint)',
                                    }}
                                >
                                    {label}
                                </dt>
                                <dd
                                    style={{
                                        margin: '2px 0 0',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: 'var(--text-heading)',
                                        textTransform: label === 'Role' ? 'capitalize' : 'none',
                                    }}
                                >
                                    {value}
                                </dd>
                            </div>
                        </div>
                    ))}
                </dl>
            </Panel>
        </div>
    );
};

export default SettingsPage;
