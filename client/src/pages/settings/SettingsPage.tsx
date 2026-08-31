import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    EnvelopeIcon,
    PhoneIcon,
    CheckIcon,
    XMarkIcon,
    KeyIcon,
    UserCircleIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetCurrentUserQuery, useUpdateCurrentUserMutation } from '@/services/userApi';
import { useAppSelector, useAppDispatch } from '@/hooks/store';
import { logout } from '@/features/auth/authSlice';

const SettingsPage = () => {
    const { accessToken, initializing } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { data: user, isLoading, isError, refetch } = useGetCurrentUserQuery(undefined, {
        skip: !accessToken || initializing,
    });
    const [updateUser, { isLoading: isUpdating }] = useUpdateCurrentUserMutation();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobileNumber: '',
        password: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const prevUserIdRef = useRef<string | undefined>(undefined);

    // Initialize form data when user data is first loaded (only when user ID changes to avoid cascading renders)
    useEffect(() => {
        if (!user || prevUserIdRef.current === user._id) return;

        prevUserIdRef.current = user._id;
        // Defer setState to avoid synchronous setState in effect
        queueMicrotask(() => {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                mobileNumber: user.mobileNumber || '',
                password: '',
            });
        });
    }, [user]);

    if (isLoading) {
        return <Loader fullScreen message="Loading settings..." />;
    }

    if (isError || !user) {
        return (
            <ErrorState
                title="Unable to load settings"
                description="Check your network or try refreshing the page."
                onRetry={refetch}
            />
        );
    }

    const handleChange = (field: string, value: string) => {
        setFormData({ ...formData, [field]: value });
        setError(null);
        setSuccess(false);
    };

    const handleSave = async () => {
        setError(null);
        setSuccess(false);

        try {
            const updatePayload: { name?: string; email?: string; mobileNumber?: string; password?: string } = {};
            const passwordChanged = formData.password && formData.password.trim() !== '';

            if (formData.name !== user.name) updatePayload.name = formData.name;
            if (formData.email !== user.email) updatePayload.email = formData.email;
            if (formData.mobileNumber !== user.mobileNumber) updatePayload.mobileNumber = formData.mobileNumber;
            if (passwordChanged) updatePayload.password = formData.password;

            // Check if there are any changes
            if (Object.keys(updatePayload).length === 0) {
                setError('No changes to save');
                return;
            }

            await updateUser(updatePayload).unwrap();

            // If password was changed, logout and redirect to login
            if (passwordChanged) {
                setSuccess(true);
                // Show success message briefly, then logout
                setTimeout(() => {
                    dispatch(logout());
                    navigate('/login', {
                        state: {
                            message: 'Password changed successfully. Please login with your new password.'
                        }
                    });
                }, 1500);
            } else {
                setSuccess(true);
                refetch();
                // Clear password field after successful update
                setFormData({ ...formData, password: '' });
                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (err) {
            const errorMessage =
                (err && typeof err === 'object' && 'data' in err &&
                    typeof err.data === 'object' && err.data !== null &&
                    'message' in err.data && typeof err.data.message === 'string')
                    ? err.data.message
                    : (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string')
                        ? err.message
                        : 'Failed to update profile. Please try again.';
            setError(errorMessage);
        }
    };

    const handleReset = () => {
        setFormData({
            name: user.name,
            email: user.email,
            mobileNumber: user.mobileNumber,
            password: '',
        });
        setError(null);
        setSuccess(false);
    };

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-brand via-brand-dark to-purple-600 p-8 shadow-2xl shadow-brand/20">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
                <div className="relative z-10">
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/80">Configuration</p>
                    <h1 className="mt-2 text-4xl font-bold text-white">Account Settings</h1>
                    <p className="mt-2 text-sm text-white/90">Update your account information and security preferences</p>
                </div>
            </div>

            {/* Settings Form */}
            <div className="rounded-sm border border-white/70 bg-white/90 p-8 shadow-card backdrop-blur-sm">
                {/* Success Message */}
                {success && (
                    <div className="mb-6 rounded-sm bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
                        <CheckIcon className="h-5 w-5 text-emerald-600" />
                        <p className="text-sm font-semibold text-emerald-800">
                            {formData.password ? 'Password changed successfully! You will be logged out shortly...' : 'Profile updated successfully!'}
                        </p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 rounded-sm bg-red-50 border border-red-200 p-4 flex items-center gap-3">
                        <ExclamationCircleIcon className="h-5 w-5 text-red-600" />
                        <p className="text-sm font-semibold text-red-800">{error}</p>
                    </div>
                )}

                <div className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Personal Information</p>
                    <p className="text-xs text-slate-400 mt-1.5">Update your account details and security settings</p>
                </div>

                <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2.5 flex items-center gap-2">
                                <UserCircleIcon className="h-4 w-4 text-brand" />
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="w-full rounded-sm border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                                placeholder="Enter your name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2.5 flex items-center gap-2">
                                <PhoneIcon className="h-4 w-4 text-brand" />
                                Mobile Number
                            </label>
                            <input
                                type="tel"
                                value={formData.mobileNumber}
                                onChange={(e) => handleChange('mobileNumber', e.target.value)}
                                className="w-full rounded-sm border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                                placeholder="Enter your mobile number"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2.5 flex items-center gap-2">
                            <EnvelopeIcon className="h-4 w-4 text-brand" />
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            className="w-full rounded-sm border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                        <label className=" text-sm font-semibold text-slate-700 mb-2.5 flex items-center gap-2">
                            <KeyIcon className="h-4 w-4 text-brand" />
                            New Password
                            <span className="text-xs font-normal text-slate-500 ml-2">(leave blank to keep current)</span>
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            className="w-full rounded-sm border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                            placeholder="Enter new password"
                        />
                        <p className="mt-2 text-xs text-slate-500">Use a strong password with at least 8 characters</p>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                        <button
                            onClick={handleSave}
                            disabled={isUpdating}
                            className="group flex items-center gap-2 rounded-sm bg-linear-to-r from-brand to-brand-dark px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/40 transition-all hover:shadow-xl hover:shadow-brand/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            <CheckIcon className="h-4 w-4 transition-transform group-hover:scale-110" />
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            onClick={handleReset}
                            disabled={isUpdating}
                            className="flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <XMarkIcon className="h-4 w-4" />
                            Reset
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;

