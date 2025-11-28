import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                    <div className="max-w-md w-full">
                        <div className="card p-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-400" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Noe gikk galt</h1>
                            <p className="text-zinc-400 mb-6">
                                Vi beklager, men det oppstod en uventet feil. Prøv å laste siden på nytt.
                            </p>

                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="text-left mb-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                                    <summary className="cursor-pointer text-sm font-medium mb-2">
                                        Tekniske detaljer
                                    </summary>
                                    <pre className="text-xs text-red-400 overflow-auto">
                                        {this.state.error.toString()}
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                </details>
                            )}

                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={this.handleReset}
                                    className="btn-primary btn-md"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Prøv igjen
                                </button>
                                <button
                                    onClick={this.handleGoHome}
                                    className="btn-ghost btn-md"
                                >
                                    <Home className="w-4 h-4 mr-2" />
                                    Gå til forsiden
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
