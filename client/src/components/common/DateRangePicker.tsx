import { toDhakaDateInput } from '@/lib/format';
import { rangeForDays } from '@/lib/dateRange';
import type { DateRange } from '@/lib/dateRange';

type Preset = { label: string; days: number };

const PRESETS: Preset[] = [
    { label: 'Today', days: 0 },
    { label: '7 days', days: 6 },
    { label: '30 days', days: 29 },
    { label: '90 days', days: 89 },
    { label: '1 year', days: 364 },
];

type DateRangePickerProps = {
    value: DateRange;
    onChange: (range: DateRange) => void;
};

const DateRangePicker = ({ value, onChange }: DateRangePickerProps) => {
    const today = toDhakaDateInput();

    const isActive = (days: number) => {
        const preset = rangeForDays(days);
        return (
            preset.startDate === value.startDate && preset.endDate === value.endDate
        );
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1 rounded-sm bg-slate-100 p-1">
                {PRESETS.map((preset) => (
                    <button
                        key={preset.label}
                        type="button"
                        onClick={() => onChange(rangeForDays(preset.days))}
                        className={`rounded-sm px-4 py-1.5 text-xs font-semibold transition ${
                            isActive(preset.days)
                                ? 'bg-white text-brand shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2 text-sm">
                <input
                    type="date"
                    aria-label="From date"
                    value={value.startDate}
                    max={value.endDate || today}
                    onChange={(e) => onChange({ ...value, startDate: e.target.value })}
                    className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-slate-700 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <span className="text-slate-400">to</span>
                <input
                    type="date"
                    aria-label="To date"
                    value={value.endDate}
                    min={value.startDate}
                    max={today}
                    onChange={(e) => onChange({ ...value, endDate: e.target.value })}
                    className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-slate-700 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
            </div>
        </div>
    );
};

export default DateRangePicker;
