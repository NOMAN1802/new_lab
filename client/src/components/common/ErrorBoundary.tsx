import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import ErrorState from './ErrorState';

const RELOAD_FLAG = 'app:reloaded-after-error';

// A lazy route chunk that fails to import (stale cache right after a deploy,
// or a cold dev-server transform) throws here rather than in a data fetch, so
// DataTable-style retry buttons never see it. One silent reload clears it.
const isChunkLoadError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return /dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically imported module/i.test(
        message
    );
};

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Without a boundary, any error thrown while rendering unmounts the whole
 * app to a blank white page with no way back except knowing to hit reload.
 */
class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
            sessionStorage.setItem(RELOAD_FLAG, '1');
            window.location.reload();
            return;
        }
        console.error(error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        display: 'flex',
                        minHeight: '100vh',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                    }}
                >
                    <ErrorState
                        title="Something went wrong"
                        description="Please reload the page and try again."
                        onRetry={() => window.location.reload()}
                        style={{ maxWidth: 420 }}
                    />
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
