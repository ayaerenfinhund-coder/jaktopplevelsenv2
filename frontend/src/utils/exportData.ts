import type { Hunt, Track, Dog } from '../types';

// Generate GPX file from tracks
export function generateGPX(tracks: Track[], huntTitle: string = 'Hunt'): string {
  const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Jaktopplevelsen"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(huntTitle)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>`;

  const gpxFooter = `
</gpx>`;

  const tracksGPX = tracks.map((track) => {
    const trackPoints = track.geojson.coordinates
      .map((coord) => {
        const [lon, lat, ele] = coord;
        return `      <trkpt lat="${lat}" lon="${lon}">${ele ? `
        <ele>${ele}</ele>` : ''}
      </trkpt>`;
      })
      .join('\n');

    return `
  <trk>
    <name>${escapeXml(track.name)}</name>
    <desc>Distance: ${track.statistics.distance_km}km, Duration: ${track.statistics.duration_minutes}min</desc>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>`;
  }).join('');

  return gpxHeader + tracksGPX + gpxFooter;
}

// Generate JSON export of all data
export function generateJSONExport(hunts: Hunt[], dogs: Dog[]): string {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: {
      hunts: hunts.map((hunt) => ({
        ...hunt,
        exportedAt: new Date().toISOString(),
      })),
      dogs: dogs.map((dog) => ({
        ...dog,
        exportedAt: new Date().toISOString(),
      })),
    },
    statistics: {
      totalHunts: hunts.length,
      totalDogs: dogs.length,
      totalGameSeen: hunts.reduce(
        (acc, h) => acc + h.game_seen.reduce((a, g) => a + g.count, 0),
        0
      ),
      totalGameHarvested: hunts.reduce(
        (acc, h) => acc + h.game_harvested.reduce((a, g) => a + g.count, 0),
        0
      ),
    },
  };

  return JSON.stringify(exportData, null, 2);
}

// Download file helper
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export hunt as GPX
export function exportHuntAsGPX(hunt: Hunt): void {
  if (hunt.tracks.length === 0) {
    throw new Error('No GPS tracks to export');
  }

  const gpx = generateGPX(hunt.tracks, hunt.title);
  const filename = `jaktopplevelsen_${hunt.date}_${hunt.location.name.toLowerCase().replace(/\s+/g, '_')}.gpx`;
  downloadFile(gpx, filename, 'application/gpx+xml');
}

// Export all data as JSON
export function exportAllDataAsJSON(hunts: Hunt[], dogs: Dog[]): void {
  const json = generateJSONExport(hunts, dogs);
  const date = new Date().toISOString().split('T')[0];
  const filename = `jaktopplevelsen_backup_${date}.json`;
  downloadFile(json, filename, 'application/json');
}

// Export single hunt as JSON
export function exportHuntAsJSON(hunt: Hunt): void {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    hunt: hunt,
  };
  const json = JSON.stringify(data, null, 2);
  const filename = `jaktopplevelsen_hunt_${hunt.date}_${hunt.location.name.toLowerCase().replace(/\s+/g, '_')}.json`;
  downloadFile(json, filename, 'application/json');
}

// Helper to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
