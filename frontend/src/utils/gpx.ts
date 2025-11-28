/**
 * Verktøyfunksjoner for GPX-parsing og GeoJSON-konvertering
 */

import type { GeoJSONLineString, TrackStatistics, TrackPoint } from '../types';

/**
 * Parse GPX XML til GeoJSON
 */
export function parseGPXToGeoJSON(gpxString: string): GeoJSONLineString {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxString, 'text/xml');

  const coordinates: [number, number, number?, number?][] = [];

  // Hent alle trackpoints
  const trackpoints = xmlDoc.getElementsByTagName('trkpt');

  for (let i = 0; i < trackpoints.length; i++) {
    const point = trackpoints[i];
    const lat = parseFloat(point.getAttribute('lat') || '0');
    const lon = parseFloat(point.getAttribute('lon') || '0');

    const coord: [number, number, number?, number?] = [lon, lat];

    // Legg til høyde hvis tilgjengelig
    const eleElement = point.getElementsByTagName('ele')[0];
    if (eleElement) {
      coord.push(parseFloat(eleElement.textContent || '0'));
    }

    // Legg til tid hvis tilgjengelig
    const timeElement = point.getElementsByTagName('time')[0];
    if (timeElement) {
      coord.push(new Date(timeElement.textContent || '').getTime() / 1000);
    }

    coordinates.push(coord);
  }

  return {
    type: 'LineString',
    coordinates,
  };
}

/**
 * Beregn distanse mellom to punkter (Haversine)
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Jordas radius i km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Beregn sporstatistikk fra GeoJSON
 */
export function calculateTrackStatistics(
  geojson: GeoJSONLineString
): TrackStatistics {
  const coords = geojson.coordinates;

  if (coords.length < 2) {
    return {
      distance_km: 0,
      duration_minutes: 0,
      avg_speed_kmh: 0,
      max_speed_kmh: 0,
      elevation_gain_m: 0,
      elevation_loss_m: 0,
      min_elevation_m: 0,
      max_elevation_m: 0,
      bounding_box: [
        [0, 0],
        [0, 0],
      ],
    };
  }

  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  let maxSpeed = 0;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (let i = 0; i < coords.length; i++) {
    const [lon, lat, ele, time] = coords[i];

    // Oppdater bounding box
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);

    // Oppdater høyde
    if (ele !== undefined) {
      minElevation = Math.min(minElevation, ele);
      maxElevation = Math.max(maxElevation, ele);
    }

    if (i > 0) {
      const [prevLon, prevLat, prevEle, prevTime] = coords[i - 1];

      // Distanse
      const dist = haversineDistance(prevLat, prevLon, lat, lon);
      totalDistance += dist;

      // Høydeforskjell
      if (ele !== undefined && prevEle !== undefined) {
        const elevDiff = ele - prevEle;
        if (elevDiff > 0) {
          elevationGain += elevDiff;
        } else {
          elevationLoss += Math.abs(elevDiff);
        }
      }

      // Hastighet
      if (time !== undefined && prevTime !== undefined) {
        const timeDiff = (time - prevTime) / 3600; // Timer
        if (timeDiff > 0) {
          const speed = dist / timeDiff;
          maxSpeed = Math.max(maxSpeed, speed);
        }
      }
    }
  }

  // Beregn varighet
  let durationMinutes = 0;
  if (
    coords.length >= 2 &&
    coords[0][3] !== undefined &&
    coords[coords.length - 1][3] !== undefined
  ) {
    durationMinutes = (coords[coords.length - 1][3]! - coords[0][3]!) / 60;
  }

  const avgSpeed =
    durationMinutes > 0 ? totalDistance / (durationMinutes / 60) : 0;

  return {
    distance_km: Math.round(totalDistance * 100) / 100,
    duration_minutes: Math.round(durationMinutes * 10) / 10,
    avg_speed_kmh: Math.round(avgSpeed * 100) / 100,
    max_speed_kmh: Math.round(maxSpeed * 100) / 100,
    elevation_gain_m: Math.round(elevationGain * 10) / 10,
    elevation_loss_m: Math.round(elevationLoss * 10) / 10,
    min_elevation_m:
      minElevation === Infinity ? 0 : Math.round(minElevation * 10) / 10,
    max_elevation_m:
      maxElevation === -Infinity ? 0 : Math.round(maxElevation * 10) / 10,
    bounding_box: [
      [minLat, minLon],
      [maxLat, maxLon],
    ],
  };
}

/**
 * Konverter GeoJSON til GPX-format
 */
export function geoJSONToGPX(
  geojson: GeoJSONLineString,
  name: string = 'Spor'
): string {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Jaktopplevelsen"
  xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${name}</name>
    <trkseg>`;

  geojson.coordinates.forEach(([lon, lat, ele, time]) => {
    gpx += `
      <trkpt lat="${lat}" lon="${lon}">`;
    if (ele !== undefined) {
      gpx += `
        <ele>${ele}</ele>`;
    }
    if (time !== undefined) {
      gpx += `
        <time>${new Date(time * 1000).toISOString()}</time>`;
    }
    gpx += `
      </trkpt>`;
  });

  gpx += `
    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

/**
 * Hent sporpunkter med metadata
 */
export function getTrackPoints(geojson: GeoJSONLineString): TrackPoint[] {
  return geojson.coordinates.map(([lon, lat, ele, time]) => ({
    lat,
    lng: lon,
    elevation: ele,
    time: time ? new Date(time * 1000).toISOString() : new Date().toISOString(),
  }));
}
