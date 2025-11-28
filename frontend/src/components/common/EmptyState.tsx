import { FileQuestion, Inbox, Search } from 'lucide-react';
import { clsx } from 'clsx';

interface EmptyStateProps {
    icon?: 'inbox' | 'search' | 'file' | 'custom';
    customIcon?: React.ReactNode;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary';
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

const icons = {
    inbox: Inbox,
    search: Search,
    file: FileQuestion,
};

export default function EmptyState({
    icon = 'inbox',
    customIcon,
    title,
    description,
    action,
    secondaryAction,
    className,
}: EmptyStateProps) {
    const Icon = customIcon ? null : (icon !== 'custom' ? icons[icon] : null);

    return (
        <div className={clsx('text-center py-12 px-4', className)}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50 mb-4">
                {customIcon || (Icon && <Icon className="w-8 h-8 text-zinc-500" />)}
            </div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-zinc-400 max-w-md mx-auto mb-6">{description}</p>
            {action && (
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={action.onClick}
                        className={clsx(
                            action.variant === 'secondary' ? 'btn-secondary btn-md' : 'btn-primary btn-md'
                        )}
                    >
                        {action.label}
                    </button>
                    {secondaryAction && (
                        <button
                            onClick={secondaryAction.onClick}
                            className="btn-ghost btn-md"
                        >
                            {secondaryAction.label}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
