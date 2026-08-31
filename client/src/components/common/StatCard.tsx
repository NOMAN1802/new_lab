import TrendPill from './TrendPill';

type StatCardProps = {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        isPositive?: boolean;
        label?: string;
    };
    accent?: string;
};

const StatCard = ({ label, value, icon, trend, accent = 'bg-brand/10 text-brand' }: StatCardProps) => (
    <div className="rounded-sm border border-white/60 bg-white/80 p-5 shadow-card shadow-slate-200/40 backdrop-blur">
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">{label}</span>
            {icon && <span className={`inline-flex h-10 w-10 items-center justify-center rounded-sm ${accent}`}>{icon}</span>}
        </div>
        <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
        {trend && (
            <div className="mt-4">
                <TrendPill value={trend.value} isPositive={trend.isPositive} label={trend.label} />
            </div>
        )}
    </div>
);

export default StatCard;

