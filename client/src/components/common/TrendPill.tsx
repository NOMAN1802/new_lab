import { ArrowTrendingDownIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/solid';

type TrendPillProps = {
    value: number;
    isPositive?: boolean;
    label?: string;
};

const TrendPill = ({ value, isPositive = true, label }: TrendPillProps) => (
    <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isPositive ? 'bg-green-100 text-success' : 'bg-rose-100 text-danger'
            }`}
    >
        {isPositive ? (
            <ArrowTrendingUpIcon className="mr-1 h-4 w-4" />
        ) : (
            <ArrowTrendingDownIcon className="mr-1 h-4 w-4" />
        )}
        {value}%
        {label && <span className="ml-1 text-[11px] font-medium text-slate-500">{label}</span>}
    </span>
);

export default TrendPill;

