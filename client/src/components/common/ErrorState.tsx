type ErrorStateProps = {
    title?: string;
    description?: string;
    onRetry?: () => void;
};

const ErrorState = ({
    title = 'Something went wrong',
    description = 'Please try again in a moment.',
    onRetry,
}: ErrorStateProps) => {
    return (
        <div className="rounded-sm border border-dashed border-rose-100 bg-white/70 p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-rose-500">{title}</p>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="mt-4 rounded-sm bg-brand px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
                >
                    Retry
                </button>
            )}
        </div>
    );
};

export default ErrorState;

