import type { CSSProperties } from 'react';
import Button from './Button';

type PaginationProps = {
    page?: number;
    totalPages?: number;
    onChange?: (page: number) => void;
    busy?: boolean;
    style?: CSSProperties;
};

/** "Page 2 of 7" plus Previous / Next. The app never numbers pages. */
const Pagination = ({ page = 1, totalPages = 1, onChange, busy = false, style }: PaginationProps) => {
    if (totalPages <= 1) return null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', ...style }}>
            <span style={{ fontSize: 'var(--text-13)', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button variant="secondary" size="sm" icon="chevron-left" disabled={page === 1 || busy} onClick={() => onChange?.(page - 1)}>
                    Previous
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    iconAfter="chevron-right"
                    disabled={page === totalPages || busy}
                    onClick={() => onChange?.(page + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
};

export default Pagination;
