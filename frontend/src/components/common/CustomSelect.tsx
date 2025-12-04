import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

export interface SelectOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    error?: boolean;
    className?: string;
    disabled?: boolean;
}

export default function CustomSelect({
    value,
    onChange,
    options,
    placeholder = 'Velg...',
    error = false,
    className,
    disabled = false,
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className={clsx('relative', className)}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={clsx(
                    'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-left',
                    'bg-zinc-950 border transition-colors duration-100',
                    error
                        ? 'border-red-500 focus:border-red-500'
                        : isOpen
                            ? 'border-zinc-600 ring-1 ring-zinc-700'
                            : 'border-zinc-800 hover:border-zinc-700',
                    disabled && 'opacity-50 cursor-not-allowed',
                    !disabled && 'cursor-pointer'
                )}
            >
                <span className={clsx(selectedOption ? 'text-zinc-100' : 'text-zinc-500')}>
                    {selectedOption ? (
                        <span className="flex items-center gap-2">
                            {selectedOption.icon}
                            {selectedOption.label}
                        </span>
                    ) : (
                        placeholder
                    )}
                </span>
                <ChevronDown
                    className={clsx(
                        'w-4 h-4 text-zinc-500 transition-transform duration-100',
                        isOpen && 'rotate-180'
                    )}
                />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setIsOpen(false)} />

                    <div className="absolute z-50 w-full mt-1 py-1 dropdown-menu max-h-60 overflow-auto">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => !option.disabled && handleSelect(option.value)}
                                disabled={option.disabled}
                                className={clsx(
                                    'w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left',
                                    'transition-colors duration-75',
                                    option.disabled
                                        ? 'text-zinc-600 cursor-not-allowed'
                                        : option.value === value
                                            ? 'bg-zinc-900 text-white'
                                            : 'text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer'
                                )}
                            >
                                <span className="flex items-center gap-2">
                                    {option.icon}
                                    {option.label}
                                </span>
                                {option.value === value && (
                                    <Check className="w-4 h-4 text-primary-400" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
