import { useState } from 'react';
import { ArrowLeft, TrendingUp, Calendar, MapPin, Target, Eye, Award, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDogs, useHunts } from '../hooks/useApi';

export default function Statistics() {
    const navigate = useNavigate();
    const { dogs, isLoading: dogsLoading } = useDogs();
    const { data: hunts = [], isLoading: huntsLoading } = useHunts();

    const [selectedDog, setSelectedDog] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [showAllHunts, setShowAllHunts] = useState(false);

    // Filter hunts by year
    const filteredHunts = hunts.filter((hunt: any) => {
        const huntDate = new Date(hunt.date);
        const inYear = huntDate.getFullYear() === selectedYear;
        const matchesDog = selectedDog === 'all' || (hunt.dogs && hunt.dogs.includes(selectedDog));
        return inYear && matchesDog;
    });

    const gameTypeLabels: Record<string, string> = {
        moose: 'Elg',
        deer: 'Hjort',
        roe_deer: 'Rådyr',
        hare: 'Hare',
        grouse: 'Rype',
        fox: 'Rev',
        // Fallbacks
        'Roe Deer': 'Rådyr',
        'Moose': 'Elg',
        'Red Deer': 'Hjort',
        'Deer': 'Hjort',
        'Grouse': 'Rype',
        'Fox': 'Rev',
        'Hare': 'Hare'
    };

    // Calculate overall statistics
    const calculateOverallStats = () => {
        // ... (keep existing logic but use filteredHunts)
        const totalHunts = filteredHunts.length;
        const totalGameSeen = filteredHunts.reduce((sum: number, hunt: any) =>
            sum + (hunt.game_seen || []).reduce((s: number, g: any) => s + (g.count || 0), 0), 0
        );
        const totalGameHarvested = filteredHunts.reduce((sum: number, hunt: any) =>
            sum + (hunt.game_harvested || []).reduce((s: number, g: any) => s + (g.count || 0), 0), 0
        );

        const locations = new Set(filteredHunts.map((h: any) => h.location?.name).filter(Boolean));
        const uniqueLocations = locations.size;

        const totalDistance = filteredHunts.reduce((sum: number, hunt: any) => {
            const tracks = hunt.tracks || [];
            return sum + tracks.reduce((s: number, track: any) =>
                s + (track.statistics?.distance_km || 0), 0
            );
        }, 0);

        const totalDuration = filteredHunts.reduce((sum: number, hunt: any) => {
            const tracks = hunt.tracks || [];
            return sum + tracks.reduce((s: number, track: any) =>
                s + (track.statistics?.duration_minutes || 0), 0
            );
        }, 0);

        // Most visited location
        const locationCounts: Record<string, number> = {};
        filteredHunts.forEach((hunt: any) => {
            const loc = hunt.location?.name;
            if (loc) locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        });
        const mostVisited = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0];

        // Game type breakdown
        const gameTypeCounts: Record<string, { seen: number; harvested: number }> = {};
        filteredHunts.forEach((hunt: any) => {
            (hunt.game_seen || []).forEach((g: any) => {
                if (!gameTypeCounts[g.type]) gameTypeCounts[g.type] = { seen: 0, harvested: 0 };
                gameTypeCounts[g.type].seen += (g.count || 0);
            });
            (hunt.game_harvested || []).forEach((g: any) => {
                if (!gameTypeCounts[g.type]) gameTypeCounts[g.type] = { seen: 0, harvested: 0 };
                gameTypeCounts[g.type].harvested += (g.count || 0);
            });
        });

        const huntsWithHarvest = filteredHunts.filter((hunt: any) =>
            (hunt.game_harvested || []).reduce((s: number, g: any) => s + (g.count || 0), 0) > 0
        ).length;

        return {
            totalHunts,
            totalGameSeen,
            totalGameHarvested,
            uniqueLocations,
            totalDistance: Math.round(totalDistance * 10) / 10,
            totalDuration: Math.round(totalDuration),
            avgDistance: totalHunts > 0 ? Math.round((totalDistance / totalHunts) * 10) / 10 : 0,
            mostVisited: mostVisited ? { name: mostVisited[0], count: mostVisited[1] } : null,
            gameTypes: gameTypeCounts,
            successRate: totalHunts > 0 ? Math.round((huntsWithHarvest / totalHunts) * 100) : 0,
        };
    };

    const stats = calculateOverallStats();
    const activeDogs = dogs.filter((d) => d.is_active);

    // Available years from hunts
    const availableYears = Array.from(new Set(hunts.map((h: any) => new Date(h.date).getFullYear()))).sort((a, b) => b - a);
    if (availableYears.length === 0) availableYears.push(new Date().getFullYear());

    if (dogsLoading || huntsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="spinner w-8 h-8 mx-auto mb-4"></div>
                    <p className="text-zinc-400">Laster statistikk...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="btn-ghost btn-icon"
                        aria-label="Tilbake til oversikt"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold">Statistikk</h1>
                        <p className="text-zinc-400 mt-1">Oversikt over dine jaktturer</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-wrap gap-4">
                    {/* Year selector */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="input-label">Sesong</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="select"
                        >
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Dog selector */}
                    {activeDogs.length > 0 && (
                        <div className="flex-1 min-w-[200px]">
                            <label className="input-label">Hund</label>
                            <select
                                value={selectedDog}
                                onChange={(e) => setSelectedDog(e.target.value)}
                                className="select"
                            >
                                <option value="all">Alle hunder</option>
                                {activeDogs.map(dog => (
                                    <option key={dog.id} value={dog.id}>{dog.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Empty state */}
            {filteredHunts.length === 0 ? (
                <div className="card p-12 text-center">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                    <h3 className="text-xl font-semibold mb-2">Ingen data for {selectedYear}</h3>
                    <p className="text-zinc-400 mb-6">
                        {selectedDog !== 'all'
                            ? 'Denne hunden har ingen registrerte turer dette året.'
                            : 'Du har ingen registrerte jaktturer dette året.'}
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="btn-primary"
                    >
                        Registrer jakttur
                    </button>
                </div>
            ) : (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="card p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-primary-500/10 rounded-lg">
                                    <Calendar className="w-5 h-5 text-primary-400" />
                                </div>
                                <span className="text-sm text-zinc-400">Totalt turer</span>
                            </div>
                            <p className="text-3xl font-bold">{stats.totalHunts}</p>
                        </div>

                        <div className="card p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <Eye className="w-5 h-5 text-emerald-400" />
                                </div>
                                <span className="text-sm text-zinc-400">Vilt sett</span>
                            </div>
                            <p className="text-3xl font-bold">{stats.totalGameSeen}</p>
                        </div>

                        <div className="card p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-accent-500/10 rounded-lg">
                                    <Target className="w-5 h-5 text-accent-400" />
                                </div>
                                <span className="text-sm text-zinc-400">Skutt</span>
                            </div>
                            <p className="text-3xl font-bold">{stats.totalGameHarvested}</p>
                        </div>

                        <div className="card p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                    <Award className="w-5 h-5 text-amber-400" />
                                </div>
                                <span className="text-sm text-zinc-400">Suksessrate</span>
                            </div>
                            <p className="text-3xl font-bold">{stats.successRate}%</p>
                        </div>
                    </div>

                    {/* Hunt List - Moved up for better focus */}
                    <div className="card">
                        <div className="card-header flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Jaktturer {selectedYear}</h2>
                            <span className="text-sm text-zinc-400">{filteredHunts.length} turer</span>
                        </div>
                        <div className="divide-y divide-white/5">
                            {filteredHunts
                                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .slice(0, showAllHunts ? undefined : 5)
                                .map((hunt: any) => (
                                    <button
                                        key={hunt.id}
                                        onClick={() => navigate(`/hunt/${hunt.id}`)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400 font-bold text-xs">
                                                {new Date(hunt.date).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' }).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-text-primary">{hunt.location?.name || 'Ukjent sted'}</h3>
                                                <p className="text-xs text-zinc-400 flex items-center gap-2">
                                                    <span>{hunt.dogs && hunt.dogs.length > 0 ? 'Med hund' : 'Uten hund'}</span>
                                                    {hunt.duration_minutes && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{Math.floor(hunt.duration_minutes / 60)}t {hunt.duration_minutes % 60}m</span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {(hunt.game_seen?.length > 0 || hunt.game_harvested?.length > 0) && (
                                                <div className="flex flex-col items-end text-xs">
                                                    {hunt.game_seen?.length > 0 && (
                                                        <span className="text-zinc-400">
                                                            {hunt.game_seen.reduce((acc: number, curr: any) => acc + curr.count, 0)} sett
                                                        </span>
                                                    )}
                                                    {hunt.game_harvested?.length > 0 && (
                                                        <span className="text-primary-400 font-medium">
                                                            {hunt.game_harvested.reduce((acc: number, curr: any) => acc + curr.count, 0)} Skutt
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="text-zinc-500">
                                                <ArrowLeft className="w-4 h-4 rotate-180" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                        </div>
                        {filteredHunts.length > 5 && (
                            <div className="p-4 border-t border-white/5 text-center">
                                <button
                                    onClick={() => setShowAllHunts(!showAllHunts)}
                                    className="text-sm text-primary-400 hover:text-primary-300 font-medium"
                                >
                                    {showAllHunts ? 'Vis færre' : `Vis alle (${filteredHunts.length})`}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card p-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-zinc-400">Total distanse</span>
                                <TrendingUp className="w-4 h-4 text-zinc-500" />
                            </div>
                            <p className="text-2xl font-bold">{stats.totalDistance} km</p>
                            <p className="text-xs text-zinc-500 mt-1">Snitt: {stats.avgDistance} km/tur</p>
                        </div>

                        <div className="card p-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-zinc-400">Total tid</span>
                                <Calendar className="w-4 h-4 text-zinc-500" />
                            </div>
                            <p className="text-2xl font-bold">{Math.floor(stats.totalDuration / 60)}t {stats.totalDuration % 60}m</p>
                            <p className="text-xs text-zinc-500 mt-1">
                                Snitt: {stats.totalHunts > 0 ? Math.round(stats.totalDuration / stats.totalHunts) : 0} min/tur
                            </p>
                        </div>

                        <div className="card p-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-zinc-400">Steder besøkt</span>
                                <MapPin className="w-4 h-4 text-zinc-500" />
                            </div>
                            <p className="text-2xl font-bold">{stats.uniqueLocations}</p>
                            {stats.mostVisited && (
                                <p className="text-xs text-zinc-500 mt-1">
                                    Mest: {stats.mostVisited.name} ({stats.mostVisited.count}x)
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Game Type Breakdown */}
                    {Object.keys(stats.gameTypes).length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h2 className="text-lg font-semibold">Viltarter</h2>
                            </div>
                            <div className="card-body">
                                <div className="space-y-4">
                                    {Object.entries(stats.gameTypes).map(([type, counts]) => (
                                        <div key={type} className="flex items-center justify-between">
                                            <span className="text-sm capitalize">{gameTypeLabels[type] || type.replace('_', ' ')}</span>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-zinc-400">
                                                    Sett: <span className="text-zinc-100 font-medium">{counts.seen}</span>
                                                </span>
                                                <span className="text-zinc-400">
                                                    Skutt: <span className="text-primary-400 font-medium">{counts.harvested}</span>
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
