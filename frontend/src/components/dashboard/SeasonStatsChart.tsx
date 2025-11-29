import { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { nb } from 'date-fns/locale';

interface SeasonStatsChartProps {
    hunts: any[];
    season: string;
}

export default function SeasonStatsChart({ hunts, season }: SeasonStatsChartProps) {
    const chartData = useMemo(() => {
        // Filter hunts for the selected season
        // This logic assumes the parent has already filtered by season, 
        // but if we pass all hunts, we should filter here. 
        // Let's assume 'hunts' passed here are already filtered or we filter them.
        // Actually, let's just use the passed hunts which are likely filteredHunts from Dashboard.

        // Group by month
        const monthlyStats = new Map<string, { name: string; hunts: number; seen: number; harvested: number }>();

        hunts.forEach(hunt => {
            const date = parseISO(hunt.date);
            const monthKey = format(date, 'yyyy-MM');
            const monthName = format(date, 'MMM', { locale: nb });

            if (!monthlyStats.has(monthKey)) {
                monthlyStats.set(monthKey, { name: monthName, hunts: 0, seen: 0, harvested: 0 });
            }

            const stats = monthlyStats.get(monthKey)!;
            stats.hunts += 1;

            // Count game
            const seenCount = hunt.game_seen?.reduce((acc: number, curr: any) => acc + curr.count, 0) || 0;
            const harvestedCount = hunt.game_harvested?.reduce((acc: number, curr: any) => acc + curr.count, 0) || 0;

            stats.seen += seenCount;
            stats.harvested += harvestedCount;
        });

        return Array.from(monthlyStats.values()).reverse(); // Reverse because hunts are usually sorted new->old
    }, [hunts]);

    if (chartData.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-zinc-500 text-sm">
                Ingen data for denne sesongen
            </div>
        );
    }

    return (
        <div className="h-[200px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                    margin={{
                        top: 10,
                        right: 10,
                        left: -20,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorHunts" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#666"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#666"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#a1a1aa' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="hunts"
                        name="Jaktturer"
                        stroke="#eab308"
                        fillOpacity={1}
                        fill="url(#colorHunts)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
