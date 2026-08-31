import { Fragment } from 'react';
import {
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    ChevronDownIcon,
    Cog6ToothIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { useRole } from '@/hooks/useRole';
import { logout } from '@/features/auth/authSlice';

type TopbarProps = {
    onMenuClick: () => void;
};

/** Longest paths first, so /billing/new wins over /billing. */
const PAGE_TITLES: [string, string][] = [
    ['/patients/new', 'Register patient'],
    ['/patients', 'Patients'],
    ['/billing/new', 'New booking'],
    ['/billing', 'Invoices'],
    ['/tests', 'Test catalogue'],
    ['/departments', 'Departments'],
    ['/referrers', 'Referrers'],
    ['/commission', 'Commission payouts'],
    ['/reports/patients', 'Patient report'],
    ['/reports/financial', 'Financial summary'],
    ['/reports/commission', 'Referral & commission'],
    ['/reports/dues', 'Outstanding payments'],
    ['/reports', 'Reports'],
    ['/activity', 'User activity'],
    ['/users', 'User management'],
    ['/settings', 'Settings'],
    ['/profile', 'Profile'],
];

const titleFor = (pathname: string): string => {
    if (pathname === '/') return 'Dashboard';
    const match = PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix));
    return match ? match[1] : 'Dashboard';
};

const Topbar = ({ onMenuClick }: TopbarProps) => {
    const user = useAppSelector((state) => state.auth.user);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAdmin } = useRole();

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    const menuItemClass = (active: boolean) =>
        `${active ? 'bg-brand/5 text-brand' : 'text-slate-700'} group flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all duration-150`;

    return (
        <header className="sticky top-0 z-40 flex items-center justify-between gap-6 border-b border-slate-200/60 bg-white px-6 py-4 lg:px-10">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-slate-600 hover:bg-slate-100 lg:hidden"
                >
                    <Bars3Icon className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">
                    {titleFor(location.pathname)}
                </h1>
            </div>

            <div className="flex items-center gap-2 lg:gap-3">
                <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center gap-2 rounded-sm py-1.5 pl-2 pr-3 transition-all hover:bg-slate-100">
                        <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-slate-200 text-sm font-semibold text-slate-600">
                            {user?.name?.[0]?.toUpperCase() ?? 'U'}
                        </span>
                        <span className="hidden text-sm font-medium text-slate-700 lg:block">
                            {user?.name ?? 'User'}
                        </span>
                        <ChevronDownIcon className="hidden h-4 w-4 text-slate-500 lg:block" />
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
                        <Menu.Items className="absolute right-0 z-50 mt-3 w-56 origin-top-right overflow-hidden rounded-sm border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 focus:outline-none">
                            <div className="border-b border-slate-200/60 bg-slate-50/50 px-3 py-3">
                                <p className="text-sm font-bold text-slate-900">
                                    {user?.name ?? 'User'}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                    {user?.email}
                                </p>
                                <p className="mt-1 text-xs capitalize text-slate-400">
                                    {user?.role}
                                </p>
                            </div>

                            <div className="py-1.5">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            type="button"
                                            onClick={() => navigate('/profile')}
                                            className={menuItemClass(active)}
                                        >
                                            <span
                                                className={`flex h-7 w-7 items-center justify-center rounded-sm ${active ? 'bg-brand/10' : 'bg-slate-100'}`}
                                            >
                                                <UserCircleIcon className="h-4 w-4" />
                                            </span>
                                            Profile
                                        </button>
                                    )}
                                </Menu.Item>

                                {isAdmin && (
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                type="button"
                                                onClick={() => navigate('/settings')}
                                                className={menuItemClass(active)}
                                            >
                                                <span
                                                    className={`flex h-7 w-7 items-center justify-center rounded-sm ${active ? 'bg-brand/10' : 'bg-slate-100'}`}
                                                >
                                                    <Cog6ToothIcon className="h-4 w-4" />
                                                </span>
                                                Settings
                                            </button>
                                        )}
                                    </Menu.Item>
                                )}
                            </div>

                            <div className="border-t border-slate-200/60 py-1.5">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className={`${active ? 'bg-danger/5 text-danger' : 'text-slate-700'} group flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all duration-150`}
                                        >
                                            <span
                                                className={`flex h-7 w-7 items-center justify-center rounded-sm ${active ? 'bg-danger/10' : 'bg-slate-100'}`}
                                            >
                                                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                            </span>
                                            Sign out
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
