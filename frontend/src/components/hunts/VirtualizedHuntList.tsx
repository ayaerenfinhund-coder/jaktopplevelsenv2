import { memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Dog, Eye, Target } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { Hunt } from '../../types';

interface VirtualizedHuntListProps {
    hunts: Hunt[];
    height?: number;
    itemHeight?: number;
}

interface HuntRowProps {
    index: number;
    style: React.CSSProperties;
    data: {
        hunts: Hunt[];
        navigate: (path: string) => void;
    };
}

const HuntRow = memo(({ index, style, data }: HuntRowProps) => {
    const { hunts, navigate } = data;
    const hunt = hunts[index];

    if (!hunt) return null;

    const totalSeen = hunt.game_seen?.reduce((acc, g) => acc + g.count, 0) || 0;
    const totalHarvested = hunt.game_harvested?.reduce((acc, g) => acc + g.count, 0) || 0;

    return (
        <div style={style}>
            <button
                onClick={() => navigate(`/hunt/${hunt.id}`)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5"
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Date Badge */}
                    <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex flex-col items-center justify-center text-primary-400 font-bold flex-shrink-0">
                        <span className="text-xs">
                            {format(new Date(hunt.date), 'MMM', { locale: nb }).toUpperCase()}
                        </span>
                        <span className="text-lg">
                            {format(new Date(hunt.date), 'd')}
                        </span>
                    </div>

                    {/* Hunt Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-text-primary truncate">
                            {hunt.title || hunt.location?.name || 'Ukjent'}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                            {hunt.location?.name && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {hunt.location.name}
                                </span>
                            )}
                            {hunt.dogs && hunt.dogs.length > 0 && (
                                <span className="flex items-center gap-1">
                                    <Dog className="w-3 h-3" />
                                    {hunt.dogs.length}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        {totalSeen > 0 && (
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-zinc-400">Sett</span>
                                <span className="text-sm font-medium text-zinc-100">{totalSeen}</span>
                            </div>
                        )}
                        {totalHarvested > 0 && (
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-zinc-400">Felt</span>
                                <span className="text-sm font-medium text-primary-400">{totalHarvested}</span>
                            </div>
                        )}
                    </div>
                </div>
            </button>
        </div>
    );
});

HuntRow.displayName = 'HuntRow';

export default function VirtualizedHuntList({
    hunts,
    height = 600,
    itemHeight = 80
}: VirtualizedHuntListProps) {
    const navigate = useNavigate();

    if (hunts.length === 0) {
        return (
            <div className="p-8 text-center text-zinc-400">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Ingen jaktturer funnet</p>
            </div>
        );
    }

    return (
        <List
            height={height}
            itemCount={hunts.length}
            itemSize={itemHeight}
            width="100%"
            itemData={{ hunts, navigate }}
            overscanCount={3}
        >
            {HuntRow}
        </List>
    );
}
