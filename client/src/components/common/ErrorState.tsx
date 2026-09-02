import type { CSSProperties } from 'react';
import Button from '@/components/ui/Button';

type ErrorStateProps = {
    title?: string;
    description?: string;
    onRetry?: () => void;
    style?: CSSProperties;
};

/** Query failure. Dashed rose box, plain-language title, one Retry. */
const ErrorState = ({
    title = 'Something went wrong',
    description = 'Please try again in a moment.',
    onRetry,
    style,
}: ErrorStateProps) => (
    <div
        style={{
            border: '1px dashed var(--rose-100)',
            background: 'var(--surface-card)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-8)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-xs)',
            ...style,
        }}
    >
        <p
            style={{
                fontSize: 'var(--text-16)',
                fontWeight: 'var(--fw-semibold)' as CSSProperties['fontWeight'],
                color: 'var(--danger-strong)',
            }}
        >
            {title}
        </p>
        <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-13)', color: 'var(--text-muted)' }}>{description}</p>
        {onRetry && (
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
                <Button onClick={onRetry} icon="rotate-ccw">
                    Retry
                </Button>
            </div>
        )}
    </div>
);

export default ErrorState;
