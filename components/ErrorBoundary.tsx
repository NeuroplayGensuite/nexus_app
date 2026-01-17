'use client';

import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    gameName: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class GameErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`Game Error (${this.props.gameName}):`, error, errorInfo);

        // Log to analytics if configured
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'exception', {
                description: `Game crash: ${this.props.gameName} - ${error.message}`,
                fatal: false,
            });
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4">
                    <div className="text-center p-8 bg-slate-800/50 rounded-2xl max-w-md border border-red-500/20">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            Oops! Something went wrong
                        </h2>
                        <p className="text-gray-400 mb-4">
                            The {this.props.gameName} game encountered an unexpected error.
                        </p>
                        {this.state.error && (
                            <div className="mb-4 p-3 bg-slate-900/50 rounded-lg text-left">
                                <p className="text-red-400 text-sm font-mono">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}
                        <div className="space-y-3">
                            <button
                                onClick={this.handleReset}
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition font-semibold"
                            >
                                Back to Home
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                            >
                                Try Again
                            </button>
                        </div>
                        <p className="text-gray-500 text-xs mt-4">
                            Don&apos;t worry - your progress has been saved!
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
