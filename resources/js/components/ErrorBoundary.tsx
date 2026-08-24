import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught React error caught by ErrorBoundary:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/dashboard';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 p-6">
                    <div className="relative max-w-lg w-full p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl text-center overflow-hidden">
                        {/* Decorative background glow */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-6 text-rose-400 shadow-lg shadow-rose-500/10 animate-pulse">
                            <AlertTriangle size={32} />
                        </div>

                        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                            Something went wrong
                        </h2>

                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            An unexpected error occurred while rendering the page. Don't worry, your data and encrypted messages are safe.
                        </p>

                        {this.state.error && (
                            <div className="mb-6 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left overflow-x-auto max-h-32 text-xs font-mono text-rose-300/90">
                                {this.state.error.message || 'Unknown error'}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium text-sm shadow-md shadow-indigo-500/25 transition-all duration-200 cursor-pointer active:scale-95"
                            >
                                <RefreshCw size={16} />
                                Reload Application
                            </button>

                            <button
                                onClick={this.handleGoHome}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all duration-200 cursor-pointer active:scale-95"
                            >
                                <Home size={16} />
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
