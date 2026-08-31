type Status =
    | 'paid'
    | 'pending'
    | 'overdue'
    | 'partial'
    | 'draft'
    | 'completed'
    | 'partially paid'
    | 'active'
    | 'inactive';

const statusStyles: Record<Status, string> = {
    paid: 'bg-emerald-100 text-success',
    completed: 'bg-emerald-100 text-success',
    pending: 'bg-amber-100 text-warning',
    'partially paid': 'bg-blue-100 text-brand',
    partial: 'bg-blue-100 text-brand',
    overdue: 'bg-rose-100 text-danger',
    draft: 'bg-slate-100 text-slate-500',
    active: 'bg-emerald-100 text-success',
    inactive: 'bg-slate-200 text-slate-500',
};

const StatusBadge = ({ status }: { status: string }) => {
    const key = status.toLowerCase() as Status;
    const classes = statusStyles[key] ?? 'bg-slate-100 text-slate-500';
    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${classes}`}>
            {status}
        </span>
    );
};

export default StatusBadge;

