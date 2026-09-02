import { Fragment, useState } from 'react';
import type { CSSProperties } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/store';
import { useRole } from '@/hooks/useRole';
import { logout } from '@/features/auth/authSlice';
import { CENTRE } from '@/lib/centre';
import type { UserRole } from '@/lib/token';
import Icon from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import LogoMark from '@/components/ui/LogoMark';

type NavChild = { name: string; to: string; roles?: UserRole[] };

type NavItem = {
    name: string;
    to: string;
    icon: IconName;
    /** Omit to show for every role. */
    roles?: UserRole[];
    children?: NavChild[];
};

const NAVIGATION: NavItem[] = [
    { name: 'Dashboard', to: '/', icon: 'layout-dashboard' },
    { name: 'Patients', to: '/patients', icon: 'users' },
    {
        name: 'Billing',
        to: '/billing',
        icon: 'credit-card',
        children: [
            { name: 'New booking', to: '/billing/new' },
            { name: 'All invoices', to: '/billing' },
        ],
    },
    {
        name: 'Catalogue',
        to: '/tests',
        icon: 'flask-conical',
        children: [
            { name: 'Tests', to: '/tests' },
            { name: 'Departments', to: '/departments', roles: ['admin'] },
        ],
    },
    { name: 'Referrers', to: '/referrers', icon: 'user-round-search', roles: ['admin'] },
    { name: 'Commission', to: '/commission', icon: 'banknote', roles: ['admin'] },
    {
        name: 'Reports',
        to: '/reports/patients',
        icon: 'chart-column',
        children: [
            { name: 'Patient report', to: '/reports/patients' },
            { name: 'Financial summary', to: '/reports/financial', roles: ['admin'] },
            { name: 'Referral & commission', to: '/reports/commission', roles: ['admin'] },
            { name: 'Outstanding payments', to: '/reports/dues', roles: ['admin'] },
        ],
    },
    { name: 'Users', to: '/users', icon: 'shield-check', roles: ['admin'] },
    { name: 'Activity', to: '/activity', icon: 'clock', roles: ['admin'] },
    { name: 'Settings', to: '/settings', icon: 'settings', roles: ['admin'] },
];

const visibleTo = (role: UserRole | undefined, roles?: UserRole[]) => !roles || (role !== undefined && roles.includes(role));

type ItemProps = {
    name: string;
    icon?: IconName;
    active: boolean;
    collapsed?: boolean;
    indent?: boolean;
    hasChildren?: boolean;
    onClick: () => void;
};

const Item = ({ name, icon, active, collapsed = false, indent = false, hasChildren = false, onClick }: ItemProps) => {
    const [hover, setHover] = useState(false);

    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            title={collapsed ? name : undefined}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                width: '100%',
                padding: indent ? '8px 12px 8px 14px' : '9px 12px',
                border: 0,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-13)',
                fontWeight: (active ? 'var(--fw-semibold)' : 'var(--fw-medium)') as CSSProperties['fontWeight'],
                background: active ? 'var(--brand-light)' : hover ? 'var(--surface-muted)' : 'transparent',
                color: active ? 'var(--brand-dark)' : hover ? 'var(--text-heading)' : 'var(--text-muted)',
                justifyContent: collapsed ? 'center' : 'flex-start',
                transition: 'var(--transition-control)',
                position: 'relative',
            }}
        >
            {active && !indent && (
                <span
                    style={{
                        position: 'absolute',
                        left: '-12px',
                        top: '9px',
                        bottom: '9px',
                        width: '3px',
                        borderRadius: 'var(--radius-pill)',
                        background: 'var(--brand)',
                    }}
                />
            )}
            {icon && <Icon name={icon} size={18} strokeWidth={active ? 2 : 1.75} />}
            {!collapsed && <span style={{ flex: 1 }}>{name}</span>}
            {!collapsed && hasChildren && <Icon name="chevron-down" size={15} />}
        </button>
    );
};

const Brand = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: collapsed ? '20px 0' : '20px',
            justifyContent: collapsed ? 'center' : 'flex-start',
        }}
    >
        <LogoMark size={34} style={{ borderRadius: 'var(--radius-md)' }} />
        {!collapsed && (
            <div style={{ minWidth: 0 }}>
                <p
                    style={{
                        fontSize: 'var(--text-14)',
                        fontWeight: 'var(--fw-bold)' as CSSProperties['fontWeight'],
                        color: 'var(--text-heading)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {CENTRE.name}
                </p>
                <p
                    style={{
                        fontSize: 'var(--text-11)',
                        fontWeight: 'var(--fw-medium)' as CSSProperties['fontWeight'],
                        letterSpacing: 'var(--tracking-caps)',
                        textTransform: 'uppercase',
                        color: 'var(--text-faint)',
                    }}
                >
                    Billing &amp; Management
                </p>
            </div>
        )}
    </div>
);

const HelpCard = () => (
    <div
        style={{
            background: 'var(--brand)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
        }}
    >
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 9,
                background: 'rgba(255,255,255,.18)',
            }}
        >
            <Icon name="life-buoy" size={16} />
        </span>
        <p style={{ fontSize: 13, fontWeight: 700 }}>Need a hand?</p>
        <p style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,.8)' }}>
            Billing rules, discounts and Dhaka-day reports explained in the handbook.
        </p>
    </div>
);

type NavListProps = {
    collapsed?: boolean;
    onNavigate?: () => void;
};

const NavList = ({ collapsed = false, onNavigate }: NavListProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { role } = useRole();
    const [openGroup, setOpenGroup] = useState<string | null>(null);

    const items = NAVIGATION.filter((item) => visibleTo(role, item.roles));

    const go = (to: string) => {
        navigate(to);
        onNavigate?.();
    };

    return (
        <nav
            style={{
                flex: 1,
                overflowY: 'auto',
                padding: '4px 12px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
            }}
        >
            {items.map((item) => {
                const children = item.children?.filter((child) => visibleTo(role, child.roles));
                const childActive = Boolean(children?.some((child) => child.to === location.pathname));
                const isOpen = !collapsed && Boolean(children?.length) && (openGroup === item.name || childActive);
                const active = item.to === location.pathname || (childActive && !isOpen);

                return (
                    <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <Item
                            name={item.name}
                            icon={item.icon}
                            active={active}
                            collapsed={collapsed}
                            hasChildren={Boolean(children?.length)}
                            onClick={() => (children?.length && !collapsed ? setOpenGroup(isOpen ? null : item.name) : go(item.to))}
                        />
                        {isOpen && children && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    margin: '2px 0 4px 15px',
                                    paddingLeft: '12px',
                                    borderLeft: '1px solid var(--border-subtle)',
                                }}
                            >
                                {children.map((child) => (
                                    <Item
                                        key={child.to}
                                        name={child.name}
                                        active={child.to === location.pathname}
                                        indent
                                        onClick={() => go(child.to)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>
    );
};

type SidebarProps = {
    open: boolean;
    onClose: () => void;
};

const Sidebar = ({ open, onClose }: SidebarProps) => {
    const [collapsed, setCollapsed] = useState(false);
    const dispatch = useAppDispatch();

    const signOut = () => dispatch(logout());

    const surface: CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-card)',
        borderRight: '1px solid var(--border-card)',
    };

    return (
        <>
            {/* Desktop */}
            <aside
                className="hidden lg:flex"
                style={{
                    ...surface,
                    width: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)',
                    flex: '0 0 auto',
                    height: '100vh',
                    position: 'sticky',
                    top: 0,
                    transition: 'width var(--dur-slow) var(--ease-standard)',
                }}
            >
                <Brand collapsed={collapsed} />
                <NavList collapsed={collapsed} />

                <div style={{ padding: collapsed ? '12px 8px' : 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {!collapsed && <HelpCard />}
                    <Button
                        variant="ghost"
                        icon="log-out"
                        block
                        onClick={signOut}
                        style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                    >
                        {!collapsed && 'Sign out'}
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={collapsed ? 'chevron-right' : 'chevron-left'}
                        block
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        onClick={() => setCollapsed((value) => !value)}
                    />
                </div>
            </aside>

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
                        <div className="fixed inset-0" style={{ background: 'rgba(15,23,42,.42)', backdropFilter: 'blur(3px)' }} />
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
                        <Dialog.Panel
                            className="fixed inset-y-0 left-0"
                            style={{ ...surface, width: 'var(--sidebar-w)', boxShadow: 'var(--shadow-pop)' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 }}>
                                <Brand />
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Close menu"
                                    style={{
                                        display: 'flex',
                                        border: 0,
                                        background: 'transparent',
                                        padding: 8,
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--text-faint)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Icon name="x" size={20} />
                                </button>
                            </div>

                            <NavList onNavigate={onClose} />

                            <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <HelpCard />
                                <Button variant="ghost" icon="log-out" block onClick={signOut} style={{ justifyContent: 'flex-start' }}>
                                    Sign out
                                </Button>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </Dialog>
            </Transition>
        </>
    );
};

export default Sidebar;
