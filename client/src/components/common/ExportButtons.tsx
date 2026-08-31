import { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { exportToExcel, exportToPdf } from '@/lib/exportTable';
import type { ExportColumn } from '@/lib/exportTable';

type ExportButtonsProps<T> = {
    title: string;
    subtitle?: string;
    filename: string;
    columns: ExportColumn<T>[];
    rows: T[];
};

const buttonClass =
    'inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40';

const ExportButtons = <T,>({ rows, ...options }: ExportButtonsProps<T>) => {
    // The export libraries load on demand, so the click has real latency.
    const [busy, setBusy] = useState<'pdf' | 'excel' | null>(null);
    const disabled = rows.length === 0 || busy !== null;

    const run = async (kind: 'pdf' | 'excel') => {
        setBusy(kind);
        try {
            const exporter = kind === 'pdf' ? exportToPdf : exportToExcel;
            await exporter({ ...options, rows });
        } catch (error) {
            console.error(error);
            toast.error(`Could not build the ${kind === 'pdf' ? 'PDF' : 'Excel'} file`);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="flex gap-2">
            <button
                type="button"
                disabled={disabled}
                onClick={() => run('pdf')}
                className={buttonClass}
            >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {busy === 'pdf' ? 'Building...' : 'PDF'}
            </button>
            <button
                type="button"
                disabled={disabled}
                onClick={() => run('excel')}
                className={buttonClass}
            >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {busy === 'excel' ? 'Building...' : 'Excel'}
            </button>
        </div>
    );
};

export default ExportButtons;
