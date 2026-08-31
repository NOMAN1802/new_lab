type LoaderProps = {
    message?: string;
    fullScreen?: boolean;
};

const Loader = ({ message = 'Loading...', fullScreen = false }: LoaderProps) => {
    if (fullScreen) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <span className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
                    <p className="text-sm font-medium text-slate-500">{message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
            <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
            {message}
        </div>
    );
};

export default Loader;

