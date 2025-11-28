import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface AlertProps {
    type: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    onDismiss?: () => void;
}

const alertStyles = {
    info: {
        container: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        icon: 'text-blue-400',
        Icon: Info,
    },
    success: {
        container: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        icon: 'text-emerald-400',
        Icon: CheckCircle2,
    },
    warning: {
        container: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        icon: 'text-amber-400',
        Icon: AlertCircle,
    },
    error: {
        container: 'bg-red-500/10 border-red-500/20 text-red-400',
        icon: 'text-red-400',
        Icon: XCircle,
    },
};

export default function Alert({ type, title, message, action, onDismiss }: AlertProps) {
    const style = alertStyles[type];
    const Icon = style.Icon;

    return (
        <div
            className={clsx(
                'rounded-lg border p-4 flex items-start gap-3',
                style.container
            )}
            role="alert"
            aria-live="polite"
        >
            <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', style.icon)} />
            <div className="flex-1 min-w-0">
                {title && <h4 className="font-semibold mb-1">{title}</h4>}
                <p className="text-sm opacity-90">{message}</p>
                {action && (
                    <button
                        onClick={action.onClick}
                        className="mt-3 text-sm font-medium underline hover:no-underline"
                    >
                        {action.label}
                    </button>
                )}
            </div>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Lukk varsel"
                >
                    <XCircle className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}
