import {
    UserCircleIcon,
    EnvelopeIcon,
    PhoneIcon,
    ShieldCheckIcon,
    CalendarIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import StatusBadge from '@/components/common/StatusBadge';
import { useGetCurrentUserQuery } from '@/services/userApi';
import { useAppSelector } from '@/hooks/store';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
    const { accessToken, initializing } = useAppSelector((state) => state.auth);
    const { data: user, isLoading, isError, refetch } = useGetCurrentUserQuery(undefined, {
        skip: !accessToken || initializing,
    });
    const navigate = useNavigate();

    if (isLoading) {
        return <Loader fullScreen message="Loading profile..." />;
    }

    if (isError || !user) {
        return (
            <ErrorState
                title="Unable to load profile"
                description="Check your network or try refreshing the page."
                onRetry={refetch}
            />
        );
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'emerald';
            case 'receptionist':
                return 'blue';
            default:
                return 'slate';
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin':
                return '👑';
            case 'receptionist':
                return '💼';
            default:
                return '👤';
        }
    };

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-brand via-brand-dark to-purple-600 p-8 shadow-2xl shadow-brand/20">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
                <div className="relative z-10">
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/80">Account</p>
                    <h1 className="mt-2 text-4xl font-bold text-white">Profile</h1>
                    <p className="mt-2 text-sm text-white/90">View your account information and details</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Profile Card - Enhanced */}
                <div className="lg:col-span-1">
                    <div className="group relative overflow-hidden rounded-sm border border-white/70 bg-white/90 p-8 shadow-card backdrop-blur-sm transition-all duration-300 hover:shadow-xl">
                        {/* Decorative gradient background */}
                        <div className="absolute inset-0 bg-linear-to-br from-brand/5 via-purple-50/50 to-pink-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                            {/* Avatar with gradient border */}
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-linear-to-br from-brand via-brand-dark to-purple-600 p-1 animate-pulse"></div>
                                <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-linear-to-br from-brand via-brand-dark to-purple-600 shadow-2xl shadow-brand/40">
                                    <span className="text-5xl font-bold text-white">
                                        {user.name?.[0]?.toUpperCase() ?? 'U'}
                                    </span>
                                </div>
                                <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-sm bg-white border-4 border-slate-50 shadow-lg">
                                    <span className="text-xl">{getRoleIcon(user.role)}</span>
                                </div>
                            </div>

                            <h2 className="mt-6 text-2xl font-bold text-slate-900">{user.name}</h2>
                            
                            <div className="mt-4 flex flex-col items-center gap-3 w-full">
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={user.status} />
                                    <span className={`rounded-sm px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-sm ${
                                        getRoleBadgeColor(user.role) === 'emerald' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                        getRoleBadgeColor(user.role) === 'blue' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                        'bg-amber-100 text-amber-700 border border-amber-200'
                                    }`}>
                                        {user.role}
                                    </span>
                                </div>
                            </div>

                            {/* Account Stats */}
                            <div className="mt-8 w-full space-y-3 pt-6 border-t border-slate-200">
                                <div className="flex items-center justify-between rounded-sm bg-slate-50/80 p-3">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4 text-slate-500" />
                                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Member Since</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">
                                        {user.createdAt ? dayjs(user.createdAt).format('MMM YYYY') : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {/* Edit Button */}
                            <button
                                onClick={() => navigate('/settings')}
                                className="mt-6 w-full rounded-sm bg-linear-to-r from-brand to-brand-dark px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/40 transition-all hover:shadow-xl hover:shadow-brand/50 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Edit Profile
                            </button>
                        </div>
                    </div>
                </div>

                {/* Details Card - Read Only */}
                <div className="lg:col-span-2">
                    <div className="rounded-sm border border-white/70 bg-white/90 p-8 shadow-card backdrop-blur-sm">
                        <div className="mb-8">
                            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Personal Information</p>
                            <p className="text-xs text-slate-400 mt-1.5">Your account details and information</p>
                        </div>

                        <div className="space-y-4">
                            <div className="group relative overflow-hidden flex items-start gap-5 rounded-sm bg-linear-to-r from-slate-50/80 to-white p-5 transition-all hover:shadow-md hover:from-slate-50 hover:to-white border border-slate-100">
                                <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-linear-to-br from-brand/10 to-brand-dark/10 shadow-sm group-hover:shadow-md transition-all">
                                    <UserCircleIcon className="h-6 w-6 text-brand" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Full Name</p>
                                    <p className="text-base font-bold text-slate-900">{user.name}</p>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden flex items-start gap-5 rounded-sm bg-linear-to-r from-slate-50/80 to-white p-5 transition-all hover:shadow-md hover:from-slate-50 hover:to-white border border-slate-100">
                                <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-linear-to-br from-blue-100 to-blue-50 shadow-sm group-hover:shadow-md transition-all">
                                    <EnvelopeIcon className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Email Address</p>
                                    <p className="text-base font-bold text-slate-900 break-all">{user.email}</p>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden flex items-start gap-5 rounded-sm bg-linear-to-r from-slate-50/80 to-white p-5 transition-all hover:shadow-md hover:from-slate-50 hover:to-white border border-slate-100">
                                <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-linear-to-br from-emerald-100 to-emerald-50 shadow-sm group-hover:shadow-md transition-all">
                                    <PhoneIcon className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Mobile Number</p>
                                    <p className="text-base font-bold text-slate-900">{user.mobileNumber}</p>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden flex items-start gap-5 rounded-sm bg-linear-to-r from-slate-50/80 to-white p-5 transition-all hover:shadow-md hover:from-slate-50 hover:to-white border border-slate-100">
                                <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-linear-to-br from-purple-100 to-purple-50 shadow-sm group-hover:shadow-md transition-all">
                                    <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Account Role</p>
                                    <p className="text-base font-bold text-slate-900 capitalize">{user.role}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
