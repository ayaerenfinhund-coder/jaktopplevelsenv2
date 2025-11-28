import { useMemo } from 'react';
import type { Track } from '../../types';

interface ElevationProfileProps {
  tracks: Track[];
}

export default function ElevationProfile({ tracks }: ElevationProfileProps) {
  const profileData = useMemo(() => {
    if (tracks.length === 0) return null;

    // Combine all tracks or show first track
    const track = tracks[0];
    const coords = track.geojson.coordinates;

    if (coords.length === 0) return null;

    // Calculate cumulative distance and elevation
    const points: { distance: number; elevation: number }[] = [];
    let totalDistance = 0;

    for (let i = 0; i < coords.length; i++) {
      const elevation = coords[i][2] || 0;

      if (i > 0) {
        // Haversine distance calculation
        const lat1 = coords[i - 1][1];
        const lon1 = coords[i - 1][0];
        const lat2 = coords[i][1];
        const lon2 = coords[i][0];

        const R = 6371; // Earth's radius in km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        totalDistance += d;
      }

      points.push({ distance: totalDistance, elevation });
    }

    // Get min/max for scaling
    const minElevation = Math.min(...points.map((p) => p.elevation));
    const maxElevation = Math.max(...points.map((p) => p.elevation));
    const elevationRange = maxElevation - minElevation || 1;

    return {
      points,
      minElevation,
      maxElevation,
      totalDistance,
      elevationRange,
    };
  }, [tracks]);

  if (!profileData || profileData.points.length < 2) {
    return null;
  }

  const { points, minElevation, maxElevation, totalDistance, elevationRange } = profileData;

  // Create SVG path
  const width = 100;
  const height = 100;
  const padding = 10;

  const pathPoints = points.map((p, i) => {
    const x = padding + ((p.distance / totalDistance) * (width - 2 * padding));
    const y = height - padding - ((p.elevation - minElevation) / elevationRange) * (height - 2 * padding);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Create fill path (close at bottom)
  const fillPath = `${pathPoints} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="bg-background-light rounded-lg p-4">
      <h4 className="text-sm font-semibold text-text-primary mb-3">Høydeprofil</h4>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-32"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <g className="stroke-background-lighter" strokeWidth="0.5">
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
            {/* Horizontal grid */}
            {[0.25, 0.5, 0.75].map((ratio) => (
              <line
                key={ratio}
                x1={padding}
                y1={height - padding - ratio * (height - 2 * padding)}
                x2={width - padding}
                y2={height - padding - ratio * (height - 2 * padding)}
                strokeDasharray="2,2"
              />
            ))}
          </g>

          {/* Fill area */}
          <path
            d={fillPath}
            fill="url(#elevationGradient)"
            opacity="0.3"
          />

          {/* Line */}
          <path
            d={pathPoints}
            fill="none"
            stroke={tracks[0]?.color || '#D4752E'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={tracks[0]?.color || '#D4752E'} />
              <stop offset="100%" stopColor={tracks[0]?.color || '#D4752E'} stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Labels */}
        <div className="flex justify-between text-xs text-text-muted mt-2">
          <span>0 km</span>
          <span>{totalDistance.toFixed(1)} km</span>
        </div>
        <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-text-muted">
          <span>{Math.round(maxElevation)}m</span>
          <span>{Math.round(minElevation)}m</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
        <div className="bg-background p-2 rounded">
          <span className="text-text-muted block">Min høyde</span>
          <span className="text-text-primary font-semibold">{Math.round(minElevation)} m</span>
        </div>
        <div className="bg-background p-2 rounded">
          <span className="text-text-muted block">Maks høyde</span>
          <span className="text-text-primary font-semibold">{Math.round(maxElevation)} m</span>
        </div>
        <div className="bg-background p-2 rounded">
          <span className="text-text-muted block">Høydeforskjell</span>
          <span className="text-text-primary font-semibold">{Math.round(elevationRange)} m</span>
        </div>
      </div>
    </div>
  );
}
