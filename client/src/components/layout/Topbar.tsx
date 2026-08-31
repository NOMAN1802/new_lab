/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment } from 'react';
import {
    Bars3Icon,
    BellIcon,
    MagnifyingGlassIcon,
    UserCircleIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    ChevronDownIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { useAppSelector, useAppDispatch } from '@/hooks/store';
import { logout } from '@/features/auth/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';

type TopbarProps = {
    onMenuClick: () => void;
};

const Topbar = ({ onMenuClick }: TopbarProps) => {
    const user = useAppSelector((state) => state.auth.user);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    // Get page title from current route
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path.startsWith('/products')) return 'Products';
        if (path.startsWith('/invoices')) return 'Orders';
        if (path.startsWith('/returns')) return 'Return Orders';
        if (path.startsWith('/damages')) return 'Damages';
        if (path.startsWith('/customers')) return 'Customers';
        if (path.startsWith('/reports')) return 'Reports';
        if (path.startsWith('/transactions')) return 'Transactions';
        if (path.startsWith('/profile')) return 'Profile';
        if (path.startsWith('/settings')) return 'Settings';
        if (path.startsWith('/users')) return 'User Management';
        return 'Dashboard';
    };

    return (
        <header className="sticky top-0 z-40 flex items-center justify-between gap-6 border-b border-slate-200/60 bg-white px-6 py-4 lg:px-10">
            {/* Left: Page Title & Mobile Menu */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-slate-600 hover:bg-slate-100 lg:hidden"
                >
                    <Bars3Icon className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">
                    {getPageTitle()}
                </h1>
            </div>

            {/* Center: Search Bar */}
            <div className="hidden flex-1 max-w-2xl lg:flex">
                <div className="relative w-full">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search something.."
                        className="w-full rounded-sm border-0 bg-slate-100/80 py-3 pl-12 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                    />
                </div>
            </div>

            {/* Right: Icons & User Menu */}
            <div className="flex items-center gap-2 lg:gap-3">
                {/* Globe Icon */}
                <button className="hidden lg:flex h-10 w-10 items-center justify-center rounded-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all">
                    <GlobeAltIcon className="h-5 w-5" />
                </button>

                {/* Notification Bell */}
                <button className="relative h-10 w-10 flex items-center justify-center rounded-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all">
                    <BellIcon className="h-5 w-5" />
                </button>

                {/* Settings Icon */}
                <button 
                    onClick={() => navigate('/settings')}
                    className="hidden lg:flex h-10 w-10 items-center justify-center rounded-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
                    title="Settings"
                >
                    <Cog6ToothIcon className="h-5 w-5" />
                </button>

                {/* User Dropdown */}
                <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center gap-2 rounded-sm pl-2 pr-3 py-1.5 hover:bg-slate-100 transition-all">
                        <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-slate-200 overflow-hidden">
                            {(user as any)?.profileImage ? (
                                <img src={(user as any).profileImage} alt={user?.name} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-sm font-semibold text-slate-600">
                                    {user?.name?.[0]?.toUpperCase() ?? 'A'}
                                </span>
                            )}
                        </div>
                        <span className="hidden lg:block text-sm font-medium text-slate-700">
                            {user?.name ?? 'User'}
                        </span>
                        <ChevronDownIcon className="hidden lg:block h-4 w-4 text-slate-500" />
                    </Menu.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="transform opacity-0 scale-95 translate-y-[-10px]"
                        enterTo="transform opacity-100 scale-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="transform opacity-100 scale-100 translate-y-0"
                        leaveTo="transform opacity-0 scale-95 translate-y-[-10px]"
                    >
                        <Menu.Items className="absolute right-0 mt-3 w-52 origin-top-right rounded-sm border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 focus:outline-none overflow-hidden z-50">
                            {/* User Info Header */}
                            <div className="px-3 py-3 bg-slate-50/50 border-b border-slate-200/60">
                                <p className="text-sm font-bold text-slate-900">{user?.name ?? 'User'}</p>
                                <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email ?? 'user@example.com'}</p>
                            </div>

                            {/* Menu Items */}
                            <div className="py-1.5">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => navigate('/profile')}
                                            className={`${active ? 'bg-brand/5 text-brand' : 'text-slate-700'
                                                } group flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all duration-150`}
                                        >
                                            <div className={`flex items-center justify-center h-7 w-7 rounded-sm ${active ? 'bg-brand/10' : 'bg-slate-100'
                                                } transition-colors`}>
                                                <UserCircleIcon className="h-4 w-4" />
                                            </div>
                                            <span>Profile</span>
                                        </button>
                                    )}
                                </Menu.Item>

                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => navigate('/settings')}
                                            className={`${active ? 'bg-brand/5 text-brand' : 'text-slate-700'
                                                } group flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all duration-150`}
                                        >
                                            <div className={`flex items-center justify-center h-7 w-7 rounded-sm ${active ? 'bg-brand/10' : 'bg-slate-100'
                                                } transition-colors`}>
                                                <Cog6ToothIcon className="h-4 w-4" />
                                            </div>
                                            <span>Settings</span>
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>

                            {/* Logout Section */}
                            <div className="border-t border-slate-200/60 py-1.5">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={handleLogout}
                                            className={`${active ? 'bg-danger/5 text-danger' : 'text-slate-700'
                                                } group flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all duration-150`}
                                        >
                                            <div className={`flex items-center justify-center h-7 w-7 rounded-sm ${active ? 'bg-danger/10' : 'bg-slate-100'
                                                } transition-colors`}>
                                                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                            </div>
                                            <span>Logout</span>
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        </header>
    );
};

export default Topbar;

