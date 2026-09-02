import type { CSSProperties } from 'react';

const styles: Record<string, [string, string]> = {
    paid: ['var(--success-bg)', 'var(--success-strong)'],
    completed: ['var(--success-bg)', 'var(--success-strong)'],
    delivered: ['var(--success-bg)', 'var(--success-strong)'],
    active: ['var(--success-bg)', 'var(--success-strong)'],
    pending: ['var(--warning-bg)', 'var(--warning-strong)'],
    unpaid: ['var(--warning-bg)', 'var(--warning-strong)'],
    partial: ['var(--info-bg)', 'var(--brand-dark)'],
    'partially paid': ['var(--info-bg)', 'var(--brand-dark)'],
    uploaded: ['var(--info-bg)', 'var(--brand-dark)'],
    overdue: ['var(--danger-bg)', 'var(--danger-strong)'],
    cancelled: ['var(--danger-bg)', 'var(--danger-strong)'],
    draft: ['var(--surface-muted)', 'var(--text-muted)'],
    inactive: ['var(--slate-200)', 'var(--text-muted)'],
};

/** Invoice, report and account state. Copy stays lowercase in data, Capitalised on screen. */
const StatusBadge = ({ status = '', style }: { status?: string; style?: CSSProperties }) => {
    const [bg, fg] = styles[String(status).toLowerCase()] || ['var(--surface-muted)', 'var(--text-muted)'];
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                background: bg,
                color: fg,
                fontSize: 'var(--text-12)',
                fontWeight: 'var(--fw-semibold)' as CSSProperties['fontWeight'],
                fontFamily: 'var(--font-sans)',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
                ...style,
            }}
        >
            {status}
        </span>
    );
};

export default StatusBadge;
