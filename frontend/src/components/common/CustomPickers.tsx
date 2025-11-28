import { useState, useRef, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { nb } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';

interface DatePickerProps {
    selected: Date;
    onChange: (date: Date) => void;
    className?: string;
}

export function DatePicker({ selected, onChange, className = '' }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(selected);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 })
    });

    const weekDays = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 cursor-pointer hover:border-zinc-700 transition-colors"
            >
                <Calendar className="w-4 h-4 text-zinc-400" />
                <span>{format(selected, 'd. MMMM yyyy', { locale: nb })}</span>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl shadow-black/50 p-4 w-64 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => setViewDate(subMonths(viewDate, 1))}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-medium text-zinc-100 capitalize">
                            {format(viewDate, 'MMMM yyyy', { locale: nb })}
                        </span>
                        <button
                            onClick={() => setViewDate(addMonths(viewDate, 1))}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-[10px] uppercase text-zinc-500 font-medium">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {days.map(day => {
                            const isSelected = isSameDay(day, selected);
                            const isCurrentMonth = isSameMonth(day, viewDate);
                            const isTodayDate = isToday(day);

                            return (
                                <button
                                    key={day.toString()}
                                    onClick={() => {
                                        onChange(day);
                                        setIsOpen(false);
                                    }}
                                    className={`
                    h-8 w-8 rounded-md text-sm flex items-center justify-center transition-colors
                    ${!isCurrentMonth ? 'text-zinc-600' : 'text-zinc-300'}
                    ${isSelected ? 'bg-primary-600 text-white font-medium' : 'hover:bg-zinc-800'}
                    ${isTodayDate && !isSelected ? 'border border-primary-500/30 text-primary-400' : ''}
                  `}
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

interface TimePickerProps {
    value: string;
    onChange: (time: string) => void;
    className?: string;
}

export function TimePicker({ value, onChange, className = '' }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = ['00', '15', '30', '45'];

    const [selectedHour, selectedMinute] = value.split(':');

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 cursor-pointer hover:border-zinc-700 transition-colors"
            >
                <Clock className="w-4 h-4 text-zinc-400" />
                <span>{value}</span>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl shadow-black/50 p-2 w-48 flex gap-2 h-64 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        <div className="text-[10px] uppercase text-zinc-500 font-medium text-center mb-2 sticky top-0 bg-zinc-900 py-1">Time</div>
                        <div className="space-y-1">
                            {hours.map(hour => (
                                <button
                                    key={hour}
                                    onClick={() => onChange(`${hour}:${selectedMinute}`)}
                                    className={`w-full py-1 rounded text-sm ${hour === selectedHour ? 'bg-primary-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                                >
                                    {hour}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="w-px bg-zinc-800" />
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        <div className="text-[10px] uppercase text-zinc-500 font-medium text-center mb-2 sticky top-0 bg-zinc-900 py-1">Min</div>
                        <div className="space-y-1">
                            {minutes.map(minute => (
                                <button
                                    key={minute}
                                    onClick={() => {
                                        onChange(`${selectedHour}:${minute}`);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full py-1 rounded text-sm ${minute === selectedMinute ? 'bg-primary-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                                >
                                    {minute}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
