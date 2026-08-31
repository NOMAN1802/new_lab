/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import {
    PlusIcon,
    EyeIcon,
    EyeSlashIcon,
    TrashIcon,
    XMarkIcon,
    UserCircleIcon,
    EnvelopeIcon,
    PhoneIcon,
    ShieldCheckIcon,
    CalendarIcon,
    KeyIcon,
    ExclamationCircleIcon,
    CheckIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import StatusBadge from '@/components/common/StatusBadge';
import { useGetUsersQuery, useDeleteUserMutation, useUpdateUserMutation, useCreateUserMutation, type User, type CreateUserInput } from '@/services/userApi';
import { useAppSelector } from '@/hooks/store';
import type { UserRole } from '@/lib/token';

const UsersPage = () => {
    const currentUser = useAppSelector((state) => state.auth.user);
    const [page, setPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState<CreateUserInput>({
        name: '',
        email: '',
        mobileNumber: '',
        password: '',
        role: 'receptionist',
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const { data, isLoading, isError, refetch } = useGetUsersQuery({ page, limit: 20 });
    const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    // Filter out current user from the list
    const filteredUsers = useMemo(() => {
        if (!data?.users || !currentUser?._id) return data?.users || [];
        return data.users.filter(user => user._id !== currentUser._id);
    }, [data?.users, currentUser?._id]);

    if (isLoading) {
        return <Loader fullScreen message="Loading users..." />;
    }

    if (isError || !data) {
        return (
            <ErrorState
                title="Unable to load users"
                description="Check your network or try refreshing the page."
                onRetry={refetch}
            />
        );
    }

    const handleDelete = async (userId: string, userName: string) => {
        if (window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
            try {
                await deleteUser(userId).unwrap();
                refetch();
            } catch (error) {
                console.error('Failed to delete user:', error);
                alert('Failed to delete user. Please try again.');
            }
        }
    };

    const handleRoleChange = async (userId: string, userName: string, newRole: UserRole) => {
        try {
            setUpdatingUserId(userId);
            await updateUser({ id: userId, data: { role: newRole } }).unwrap();
            refetch();
        } catch (error) {
            console.error('Failed to update role:', error);
            alert(`Failed to update role for ${userName}. Please try again.`);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleViewUser = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    const handleOpenAddUserModal = () => {
        setIsAddUserModalOpen(true);
        setFormData({
            name: '',
            email: '',
            mobileNumber: '',
            password: '',
            role: 'receptionist',
        });
        setError(null);
        setSuccess(false);
    };

    const handleCloseAddUserModal = () => {
        setIsAddUserModalOpen(false);
        setFormData({
            name: '',
            email: '',
            mobileNumber: '',
            password: '',
            role: 'receptionist',
        });
        setError(null);
        setSuccess(false);
    };

    const handleCreateUser = async () => {
        setError(null);
        setSuccess(false);

        // Validation
        if (!formData.name.trim()) {
            setError('Name is required');
            return;
        }

        if (!formData.mobileNumber.trim()) {
            setError('Mobile number is required');
            return;
        }
        if (!formData.password.trim() || formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        try {
            await createUser(formData).unwrap();
            setSuccess(true);
            refetch();
            setTimeout(() => {
                handleCloseAddUserModal();
            }, 1500);
        } catch (err: any) {
            const errorMessage = err?.data?.message || err?.message || 'Failed to create user. Please try again.';
            setError(errorMessage);
        }
    };

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

    const totalPages = Math.ceil(data.total / data.limit);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-brand via-brand-dark to-purple-600 p-8 shadow-2xl shadow-brand/20">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/80">Administration</p>
                        <h1 className="mt-2 text-4xl font-bold text-white">User Management</h1>
                        <p className="mt-2 text-sm text-white/90">Manage system users and their permissions</p>
                    </div>
                    <button
                        onClick={handleOpenAddUserModal}
                        className="flex items-center gap-2 rounded-sm bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/20 hover:shadow-lg"
                    >
                        <PlusIcon className="h-5 w-5" />
                        Add User
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                        <thead className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            <tr>
                                <th className="py-3 pr-4">S/N</th>
                                <th className="py-3 pr-4">User</th>
                                <th className="py-3 pr-4">Email</th>
                                <th className="py-3 pr-4">Mobile</th>
                                <th className="py-3 pr-4">Role</th>
                                <th className="py-3 pr-4">Status</th>
                                <th className="py-3 pr-4">Created</th>
                                <th className="py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user, idx) => (
                                    <tr key={user._id} className="transition hover:bg-slate-50/80">
                                        <td className="py-4 pr-4 text-slate-400 text-xs">{idx + 1}</td>
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-brand via-brand-dark to-purple-600">
                                                    <span className="text-sm font-bold text-white">
                                                        {user.name?.[0]?.toUpperCase() ?? 'U'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{user.name}</p>
                                                    <p className="text-xs text-slate-500">ID: {user._id.slice(-6)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <p className="text-sm text-slate-900">{user.email}</p>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <p className="text-sm text-slate-900">{user.mobileNumber}</p>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`rounded-sm px-3 py-1 text-xs font-bold uppercase tracking-wider ${getRoleBadgeColor(user.role) === 'emerald' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                    getRoleBadgeColor(user.role) === 'blue' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                        'bg-amber-100 text-amber-700 border border-amber-200'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                                <select
                                                    disabled={user.role === 'admin' || isUpdating || updatingUserId === user._id}
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user._id, user.name, e.target.value as UserRole)}
                                                    className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 disabled:opacity-60"
                                                    title={user.role === 'admin' ? 'Cannot change another admin role' : 'Change role'}
                                                >
                                                    <option value="admin">Admin</option>
                                                    <option value="receptionist">Receptionist</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <StatusBadge status={user.status} />
                                        </td>
                                        <td className="py-4 pr-4">
                                            <p className="text-sm text-slate-600">
                                                {user.createdAt ? dayjs(user.createdAt).format('DD MMM YYYY') : 'N/A'}
                                            </p>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleViewUser(user)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-sm bg-blue-50 text-blue-600 transition-all hover:bg-blue-100 hover:shadow-sm"
                                                    title="View user details"
                                                >
                                                    <EyeIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user._id, user.name)}
                                                    disabled={isDeleting || user.role === 'admin'}
                                                    className={`flex h-8 w-8 items-center justify-center rounded-sm transition-all ${user.role === 'admin'
                                                        ? 'bg-red-50 text-red-400 opacity-60 cursor-not-allowed'
                                                        : 'bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
                                                        }`}
                                                    title={user.role === 'admin' ? 'Cannot delete another admin' : 'Delete user'}
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
                        <p className="text-sm text-slate-600">
                            Showing {((page - 1) * data.limit) + 1} to {Math.min(page * data.limit, data.total)} of {data.total} users
                            {filteredUsers.length < data.users.length && ` (${filteredUsers.length} excluding you)`}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="px-4 py-2 text-sm font-semibold text-slate-700">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* User Details Modal */}
            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-sm bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">User Details</h2>
                            <button
                                onClick={handleCloseModal}
                                className="rounded-sm p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Profile Header */}
                            <div className="flex flex-col items-center pb-6 border-b border-slate-200">
                                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-brand via-brand-dark to-purple-600 shadow-lg shadow-brand/30">
                                    <span className="text-4xl font-bold text-white">
                                        {selectedUser.name?.[0]?.toUpperCase() ?? 'U'}
                                    </span>
                                </div>
                                <h3 className="mt-4 text-2xl font-bold text-slate-900">{selectedUser.name}</h3>
                                <div className="mt-3 flex items-center gap-2">
                                    <StatusBadge status={selectedUser.status} />
                                    <span className={`rounded-sm px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${getRoleBadgeColor(selectedUser.role) === 'emerald' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                        getRoleBadgeColor(selectedUser.role) === 'blue' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                            'bg-amber-100 text-amber-700 border border-amber-200'
                                        }`}>
                                        {selectedUser.role}
                                    </span>
                                </div>
                            </div>

                            {/* User Information */}
                            <div className="space-y-4">
                                <div className="group flex items-start gap-5 rounded-sm bg-linear-to-r from-slate-50/80 to-white p-5 border border-slate-100">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-linear-to-br from-brand/10 to-brand-dark/10 shadow-sm">
                                        <UserCircleIcon className="h-6 w-6 text-brand" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Full Name</p>
                                        <p className="text-base font-bold text-slate-900">{selectedUser.name}</p>
                                    </div>
                                </div>

                                <div className="group flex items-start gap-5 rounded-sm bg-linear-to-r from-slate-50/80 to-white p-5 border border-slate-100">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-linear-to-br from-blue-100 to-blue-50 shadow-sm">
                                        <EnvelopeIcon className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Email Address</p>
                                        <p className="text-base font-bold text-slate-900 break-all">{selectedUser.email}</p>
                                    </div>
                                </div>

                                <div className="group flex items-start gap-5 rounded-sm bg-linear-to-r from-slate-50/80 to-white p-5 border border-slate-100">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-linear-to-br from-emerald-100 to-emerald-50 shadow-sm">
                                        <PhoneIcon className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Mobile Number</p>
                                        <p className="text-base font-bold text-slate-900">{selectedUser.mobileNumber}</p>
                                    </div>
                                </div>

                                <div className="group flex items-start gap-5 rounded-sm bg-linear-to-r from-slate-50/80 to-white p-5 border border-slate-100">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-linear-to-br from-purple-100 to-purple-50 shadow-sm">
                                        <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Account Role</p>
                                        <p className="text-base font-bold text-slate-900 capitalize">{selectedUser.role}</p>
                                    </div>
                                </div>

                                <div className="group flex items-start gap-5 rounded-sm bg-linear-to-r from-slate-50/80 to-white p-5 border border-slate-100">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-linear-to-br from-amber-100 to-amber-50 shadow-sm">
                                        <CalendarIcon className="h-6 w-6 text-amber-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Member Since</p>
                                        <p className="text-base font-bold text-slate-900">
                                            {selectedUser.createdAt ? dayjs(selectedUser.createdAt).format('DD MMMM YYYY') : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {selectedUser.updatedAt && (
                                    <div className="group flex items-start gap-5 rounded-sm bg-linear-to-r from-slate-50/80 to-white p-5 border border-slate-100">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-linear-to-br from-slate-100 to-slate-50 shadow-sm">
                                            <CalendarIcon className="h-6 w-6 text-slate-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Last Updated</p>
                                            <p className="text-base font-bold text-slate-900">
                                                {dayjs(selectedUser.updatedAt).format('DD MMMM YYYY')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Close Button */}
                            <div className="flex justify-end pt-4 border-t border-slate-200">
                                <button
                                    onClick={handleCloseModal}
                                    className="rounded-sm bg-linear-to-r from-brand to-brand-dark px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-sm bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Add New User</h2>
                                <p className="text-sm text-slate-500 mt-1">Create a receptionist or admin account</p>
                            </div>
                            <button
                                onClick={handleCloseAddUserModal}
                                className="rounded-sm p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Success Message */}
                        {success && (
                            <div className="mb-6 rounded-sm bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
                                <CheckIcon className="h-5 w-5 text-emerald-600" />
                                <p className="text-sm font-semibold text-emerald-800">User created successfully!</p>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 rounded-sm bg-red-50 border border-red-200 p-4 flex items-center gap-3">
                                <ExclamationCircleIcon className="h-5 w-5 text-red-600" />
                                <p className="text-sm font-semibold text-red-800">{error}</p>
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Name Input */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2.5">
                                    <UserCircleIcon className="h-4 w-4 text-brand" />
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-sm border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                                    placeholder="Enter full name"
                                />
                            </div>

                            {/* Email Input */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2.5">
                                    <EnvelopeIcon className="h-4 w-4 text-brand" />
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full rounded-sm border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                                    placeholder="Enter email address"
                                />
                            </div>

                            {/* Mobile Number Input */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2.5">
                                    <PhoneIcon className="h-4 w-4 text-brand" />
                                    Mobile Number
                                </label>
                                <input
                                    type="tel"
                                    value={formData.mobileNumber}
                                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                                    className="w-full rounded-sm border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                                    placeholder="Enter mobile number"
                                />
                            </div>

                            {/* Password Input */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2.5">
                                    <KeyIcon className="h-4 w-4 text-brand" />
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full rounded-sm border border-slate-200 bg-white px-4 py-3.5 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                                        placeholder="Enter password (min 6 characters)"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                    >
                                        {showPassword ? (
                                            <EyeSlashIcon className="h-5 w-5" />
                                        ) : (
                                            <EyeIcon className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">Password must be at least 6 characters long</p>
                            </div>

                            {/* Role Select */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2.5">
                                    <ShieldCheckIcon className="h-4 w-4 text-brand" />
                                    Role
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                    className="w-full rounded-sm border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-sm"
                                >
                                    <option value="receptionist">Receptionist</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <p className="mt-2 text-xs text-slate-500">Receptionists get operational access only — no financial figures</p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                                <button
                                    onClick={handleCreateUser}
                                    disabled={isCreating}
                                    className="flex items-center gap-2 rounded-sm bg-linear-to-r from-brand to-brand-dark px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/40 transition-all hover:shadow-xl hover:shadow-brand/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    <CheckIcon className="h-4 w-4" />
                                    {isCreating ? 'Creating...' : 'Create User'}
                                </button>
                                <button
                                    onClick={handleCloseAddUserModal}
                                    disabled={isCreating}
                                    className="flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;

