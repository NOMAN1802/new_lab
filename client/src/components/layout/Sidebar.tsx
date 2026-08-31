import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    ArrowLeftOnRectangleIcon,
    BanknotesIcon,
    BeakerIcon,
    ChartBarIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ClockIcon,
    Cog6ToothIcon,
    CreditCardIcon,
    DocumentChartBarIcon,
    HomeIcon,
    ShieldCheckIcon,
    UserGroupIcon,
    UsersIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch } from '@/hooks/store';
import { useRole } from '@/hooks/useRole';
import { logout } from '@/features/auth/authSlice';
import { CENTRE } from '@/lib/centre';
import type { UserRole } from '@/lib/token';

type NavItem = {
    name: string;
    to: string;
    icon: React.ComponentType<{ className?: string }>;
    /** Omit to show for every role. */
    roles?: UserRole[];
    children?: { name: string; to: string; roles?: UserRole[] }[];
};

const NAVIGATION: NavItem[] = [
    { name: 'Dashboard', to: '/', icon: HomeIcon },
    { name: 'Patients', to: '/patients', icon: UserGroupIcon },
    {
        name: 'Billing',
        to: '/billing',
        icon: CreditCardIcon,
        children: [
            { name: 'New booking', to: '/billing/new' },
            { name: 'All invoices', to: '/billing' },
        ],
    },
    {
        name: 'Catalogue',
        to: '/tests',
        icon: BeakerIcon,
        children: [
            { name: 'Tests', to: '/tests' },
            { name: 'Departments', to: '/departments', roles: ['admin'] },
        ],
    },
    { name: 'Referrers', to: '/referrers', icon: UsersIcon, roles: ['admin'] },
    { name: 'Commission', to: '/commission', icon: BanknotesIcon, roles: ['admin'] },
    {
        name: 'Reports',
        to: '/reports/patients',
        icon: ChartBarIcon,
        children: [
            { name: 'Patient report', to: '/reports/patients' },
            { name: 'Financial summary', to: '/reports/financial', roles: ['admin'] },
            { name: 'Referral & commission', to: '/reports/commission', roles: ['admin'] },
            { name: 'Outstanding payments', to: '/reports/dues', roles: ['admin'] },
        ],
    },
    { name: 'Users', to: '/users', icon: ShieldCheckIcon, roles: ['admin'] },
    { name: 'Activity', to: '/activity', icon: ClockIcon, roles: ['admin'] },
    { name: 'Settings', to: '/settings', icon: Cog6ToothIcon, roles: ['admin'] },
];

const visibleTo = (role: UserRole | undefined, roles?: UserRole[]) =>
    !roles || (role !== undefined && roles.includes(role));

const linkClass = (active: boolean) =>
    `group relative flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
        active
            ? 'bg-linear-to-r from-brand to-brand-dark text-white shadow-lg shadow-brand/30'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

type SidebarContentProps = {
    collapsed?: boolean;
    onNavigate?: () => void;
};

const SidebarContent = ({ collapsed = false, onNavigate }: SidebarContentProps) => {
    const location = useLocation();
    const { role } = useRole();
    const [openGroup, setOpenGroup] = useState<string | null>(null);

    const items = NAVIGATION.filter((item) => visibleTo(role, item.roles));

    return (
        <nav className="mt-4 space-y-1">
            {items.map((item) => {
                const children = item.children?.filter((child) =>
                    visibleTo(role, child.roles)
                );
                const hasChildren = Boolean(children?.length) && !collapsed;
                const isChildActive = children?.some(
                    (child) => child.to === location.pathname
                );
                const isActive = location.pathname === item.to || isChildActive;

                if (hasChildren) {
                    const isOpen = openGroup === item.name || isChildActive;

                    return (
                        <div key={item.name}>
                            <button
                                type="button"
                                onClick={() => setOpenGroup(isOpen ? null : item.name)}
                                className={linkClass(Boolean(isActive))}
                                aria-expanded={isOpen}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                <span className="flex-1 text-left">{item.name}</span>
                                <ChevronDownIcon
                                    className={`h-4 w-4 transition-transform ${
                                        isOpen ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>

                            {isOpen && (
                                <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-200 pl-3">
                                    {children!.map((child) => (
                                        <NavLink
                                            key={child.to}
                                            to={child.to}
                                            end
                                            onClick={onNavigate}
                                            className={({ isActive: active }) =>
                                                `block rounded-sm px-3 py-2 text-sm transition ${
                                                    active
                                                        ? 'bg-brand/10 font-semibold text-brand'
                                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                                }`
                                            }
                                        >
                                            {child.name}
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                }

                return (
                    <NavLink
                        key={item.name}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={onNavigate}
                        className={({ isActive: active }) => linkClass(active)}
                        title={collapsed ? item.name : undefined}
                    >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span className="flex-1">{item.name}</span>}
                    </NavLink>
                );
            })}
        </nav>
    );
};

const Brand = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div
        className={`flex items-center gap-3 border-b border-slate-200/60 px-6 py-6 ${
            collapsed ? 'justify-center px-4' : ''
        }`}
    >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-linear-to-br from-brand to-brand-dark text-white shadow-lg shadow-brand/30">
            <DocumentChartBarIcon className="h-6 w-6" />
        </span>
        {!collapsed && (
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold leading-tight text-slate-900">
                    {CENTRE.name}
                </p>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Billing &amp; Management
                </p>
            </div>
        )}
    </div>
);

type SidebarProps = {
    open: boolean;
    onClose: () => void;
};

const Sidebar = ({ open, onClose }: SidebarProps) => {
    const [collapsed, setCollapsed] = useState(false);
    const dispatch = useAppDispatch();

    const signOut = () => dispatch(logout());

    return (
        <>
            {/* Desktop */}
            <div
                className={`hidden lg:flex lg:flex-col lg:border-r lg:border-slate-200/60 lg:bg-white/80 lg:shadow-2xl lg:shadow-slate-900/5 lg:backdrop-blur-xl lg:transition-all lg:duration-300 ${
                    collapsed ? 'lg:w-20' : 'lg:w-72'
                }`}
            >
                <Brand collapsed={collapsed} />

                <div className="flex-1 overflow-y-auto px-4 py-2">
                    <SidebarContent collapsed={collapsed} />
                </div>

                <div className="space-y-1 border-t border-slate-200/60 px-4 py-4">
                    <button
                        type="button"
                        onClick={signOut}
                        className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                        title={collapsed ? 'Sign out' : undefined}
                    >
                        <ArrowLeftOnRectangleIcon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Sign out</span>}
                    </button>

                    <button
                        type="button"
                        onClick={() => setCollapsed((value) => !value)}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className="flex w-full items-center justify-center rounded-sm border border-slate-200 px-3 py-2 text-slate-500 transition hover:bg-slate-50"
                    >
                        {collapsed ? (
                            <ChevronRightIcon className="h-4 w-4" />
                        ) : (
                            <ChevronLeftIcon className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile */}
            <Transition show={open} as={Fragment}>
                <Dialog onClose={onClose} className="relative z-50 lg:hidden">
                    <Transition.Child
                        as={Fragment}
                        enter="transition-opacity ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition-opacity ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    </Transition.Child>

                    <Transition.Child
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="-translate-x-full"
                        enterTo="translate-x-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="translate-x-0"
                        leaveTo="-translate-x-full"
                    >
                        <Dialog.Panel className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-200/60 pr-3">
                                <div className="flex-1">
                                    <Brand />
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Close menu"
                                    className="rounded-sm p-2 text-slate-500 transition hover:bg-slate-100"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-2">
                                <SidebarContent onNavigate={onClose} />
                            </div>

                            <div className="border-t border-slate-200/60 px-4 py-4">
                                <button
                                    type="button"
                                    onClick={signOut}
                                    className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                                >
                                    <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                                    Sign out
                                </button>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </Dialog>
            </Transition>
        </>
    );
};

export default Sidebar;
