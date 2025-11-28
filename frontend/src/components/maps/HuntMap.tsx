import { useEffect, useState, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
  LayersControl,
  WMSTileLayer,
  ScaleControl,
  Circle,
  useMapEvents,
} from 'react-leaflet';
import { LatLngBounds, Icon, LatLng } from 'leaflet';
import { Maximize2, Minimize2, Ruler, Flame, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { Track } from '../../types';

// Fix for default marker icon
const dogIcon = new Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#D4752E" stroke="#fff" stroke-width="1.5">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8c-2 0-3.5 1.5-3.5 3.5 0 1.5 1 2.5 2 3v1.5h3v-1.5c1-.5 2-1.5 2-3C15.5 9.5 14 8 12 8z" fill="#fff"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

interface HuntMapProps {
  tracks: Track[];
  center?: [number, number];
  zoom?: number;
  showControls?: boolean;
  animationTime?: number;
  initialHeight?: 'small' | 'medium' | 'large';
}

// Komponent for å tilpasse kartvisningen til sporene
function MapBoundsUpdater({ tracks }: { tracks: Track[] }) {
  const map = useMap();

  useEffect(() => {
    if (tracks.length === 0) return;

    let allCoords: [number, number][] = [];
    tracks.forEach((track) => {
      track.geojson.coordinates.forEach((coord) => {
        allCoords.push([coord[1], coord[0]]);
      });
    });

    if (allCoords.length > 0) {
      const bounds = new LatLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [tracks, map]);

  return null;
}

// Distance measurement tool
interface MeasurePoint {
  lat: number;
  lng: number;
}

function DistanceMeasurer({
  isActive,
  onMeasure,
}: {
  isActive: boolean;
  onMeasure: (distance: number) => void;
}) {
  const [points, setPoints] = useState<MeasurePoint[]>([]);
  const map = useMap();

  useMapEvents({
    click(e) {
      if (!isActive) return;

      const newPoints = [...points, { lat: e.latlng.lat, lng: e.latlng.lng }];
      setPoints(newPoints);

      if (newPoints.length >= 2) {
        const totalDistance = calculateTotalDistance(newPoints);
        onMeasure(totalDistance);
      }
    },
  });

  const calculateTotalDistance = (pts: MeasurePoint[]): number => {
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const lat1 = pts[i - 1].lat;
      const lon1 = pts[i - 1].lng;
      const lat2 = pts[i].lat;
      const lon2 = pts[i].lng;

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
      total += R * c;
    }
    return total;
  };

  useEffect(() => {
    if (!isActive) {
      setPoints([]);
    }
  }, [isActive]);

  if (!isActive || points.length === 0) return null;

  const linePositions = points.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <>
      <Polyline
        positions={linePositions}
        pathOptions={{
          color: '#FF6B6B',
          weight: 3,
          dashArray: '10, 10',
          opacity: 0.8,
        }}
      />
      {points.map((point, i) => (
        <Circle
          key={i}
          center={[point.lat, point.lng]}
          radius={20}
          pathOptions={{
            color: '#FF6B6B',
            fillColor: '#FF6B6B',
            fillOpacity: 0.8,
            weight: 2,
          }}
        />
      ))}
    </>
  );
}

// Generate heatmap data from tracks
function generateHeatmapData(tracks: Track[]): { lat: number; lng: number; intensity: number }[] {
  const heatPoints: Map<string, number> = new Map();

  tracks.forEach((track) => {
    track.geojson.coordinates.forEach((coord) => {
      // Round to ~100m grid
      const gridLat = Math.round(coord[1] * 1000) / 1000;
      const gridLng = Math.round(coord[0] * 1000) / 1000;
      const key = `${gridLat},${gridLng}`;
      heatPoints.set(key, (heatPoints.get(key) || 0) + 1);
    });
  });

  const maxIntensity = Math.max(...heatPoints.values());

  return Array.from(heatPoints.entries()).map(([key, count]) => {
    const [lat, lng] = key.split(',').map(Number);
    return {
      lat,
      lng,
      intensity: count / maxIntensity,
    };
  });
}

// Kartverket WMTS - samme som norgeskart.no bruker
const MAP_LAYERS = {
  // Mapbox Outdoors - beste for jakt og friluftsliv
  mapboxOutdoors: {
    name: 'Mapbox Outdoors',
    url: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{z}/{x}/{y}?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`,
    attribution: '© <a href="https://mapbox.com">Mapbox</a>',
    maxZoom: 22,
  },
  // Mapbox Satellite med gatenavn
  mapboxSatellite: {
    name: 'Mapbox Satellitt',
    url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`,
    attribution: '© <a href="https://mapbox.com">Mapbox</a>',
    maxZoom: 22,
  },
  // Norgeskart Topografisk - hovedkart fra Kartverket
  topo: {
    name: 'Norgeskart Topo',
    url: 'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
    attribution: '© <a href="https://kartverket.no">Kartverket</a>',
    maxZoom: 20,
  },
  // Toporaster - detaljert rasterkart
  toporaster: {
    name: 'Topografisk Raster',
    url: 'https://cache.kartverket.no/v1/wmts/1.0.0/toporaster/default/webmercator/{z}/{y}/{x}.png',
    attribution: '© <a href="https://kartverket.no">Kartverket</a>',
    maxZoom: 18,
  },
  // Flyfoto - ESRI World Imagery (fungerer uten API-nøkkel)
  flyfoto: {
    name: 'Flyfoto',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  // OpenTopoMap som backup
  openTopo: {
    name: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
};

// WMS overlays - tilleggsinfo
const WMS_OVERLAYS = {
  eiendom: {
    name: 'Eiendomsgrenser',
    url: 'https://wms.geonorge.no/skwms1/wms.matrikkelkart',
    layers: 'matrikkelkart',
  },
  markslag: {
    name: 'Markslag (skog/myr)',
    url: 'https://wms.nibio.no/cgi-bin/ar5',
    layers: 'Arealtype',
  },
};

export default function HuntMap({
  tracks,
  center = [62.0, 10.0],
  zoom = 12,
  showControls = true,
  animationTime = 100,
  initialHeight = 'small',
}: HuntMapProps) {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showPropertyBoundaries, setShowPropertyBoundaries] = useState(false);
  const [showLandUse, setShowLandUse] = useState(false);
  const [mapHeight, setMapHeight] = useState<'small' | 'medium' | 'large'>(initialHeight);

  // Map tools
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const heatmapData = useMemo(() => generateHeatmapData(tracks), [tracks]);

  const heightClasses = {
    small: 'h-[300px]',
    medium: 'h-[450px]',
    large: 'h-[600px]',
  };

  const cycleHeight = () => {
    if (mapHeight === 'small') setMapHeight('medium');
    else if (mapHeight === 'medium') setMapHeight('large');
    else setMapHeight('small');
  };

  const getVisibleCoordinates = (track: Track) => {
    if (animationTime >= 100) {
      return track.geojson.coordinates.map((c) => [c[1], c[0]] as [number, number]);
    }

    const totalPoints = track.geojson.coordinates.length;
    const visibleCount = Math.floor((animationTime / 100) * totalPoints);
    return track.geojson.coordinates
      .slice(0, visibleCount)
      .map((c) => [c[1], c[0]] as [number, number]);
  };

  const getLastPosition = (track: Track): [number, number] | null => {
    const coords = getVisibleCoordinates(track);
    if (coords.length === 0) return null;
    return coords[coords.length - 1];
  };

  return (
    <div className={`relative w-full ${heightClasses[mapHeight]} transition-all duration-300`}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full rounded-lg"
        zoomControl={showControls}
        attributionControl={true}
      >
        {/* Kartverket WMTS - norgeskart.no sine kartlag */}
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name={MAP_LAYERS.mapboxOutdoors.name}>
            <TileLayer
              url={MAP_LAYERS.mapboxOutdoors.url}
              attribution={MAP_LAYERS.mapboxOutdoors.attribution}
              maxZoom={MAP_LAYERS.mapboxOutdoors.maxZoom}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name={MAP_LAYERS.mapboxSatellite.name}>
            <TileLayer
              url={MAP_LAYERS.mapboxSatellite.url}
              attribution={MAP_LAYERS.mapboxSatellite.attribution}
              maxZoom={MAP_LAYERS.mapboxSatellite.maxZoom}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name={MAP_LAYERS.topo.name}>
            <TileLayer
              url={MAP_LAYERS.topo.url}
              attribution={MAP_LAYERS.topo.attribution}
              maxZoom={MAP_LAYERS.topo.maxZoom}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name={MAP_LAYERS.toporaster.name}>
            <TileLayer
              url={MAP_LAYERS.toporaster.url}
              attribution={MAP_LAYERS.toporaster.attribution}
              maxZoom={MAP_LAYERS.toporaster.maxZoom}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name={MAP_LAYERS.flyfoto.name}>
            <TileLayer
              url={MAP_LAYERS.flyfoto.url}
              attribution={MAP_LAYERS.flyfoto.attribution}
              maxZoom={MAP_LAYERS.flyfoto.maxZoom}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name={MAP_LAYERS.openTopo.name}>
            <TileLayer
              url={MAP_LAYERS.openTopo.url}
              attribution={MAP_LAYERS.openTopo.attribution}
              maxZoom={MAP_LAYERS.openTopo.maxZoom}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Eiendomsgrenser WMS */}
        {showPropertyBoundaries && (
          <WMSTileLayer
            url={WMS_OVERLAYS.eiendom.url}
            layers={WMS_OVERLAYS.eiendom.layers}
            format="image/png"
            transparent={true}
            opacity={0.6}
          />
        )}

        {/* Markslag WMS */}
        {showLandUse && (
          <WMSTileLayer
            url={WMS_OVERLAYS.markslag.url}
            layers={WMS_OVERLAYS.markslag.layers}
            format="image/png"
            transparent={true}
            opacity={0.4}
          />
        )}

        {/* Tegn GPS-spor */}
        {tracks.map((track) => {
          const positions = getVisibleCoordinates(track);
          const lastPos = getLastPosition(track);

          return (
            <div key={track.id}>
              {/* Sporskygge for dybde */}
              <Polyline
                positions={positions}
                pathOptions={{
                  color: '#000',
                  weight: 7,
                  opacity: 0.3,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Hovedspor */}
              <Polyline
                positions={positions}
                pathOptions={{
                  color: track.color,
                  weight: 5,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
                eventHandlers={{
                  click: () => setSelectedTrack(track),
                }}
              />

              {/* Startpunkt */}
              {positions.length > 0 && (
                <Marker position={positions[0]} icon={dogIcon}>
                  <Popup>
                    <div className="text-sm font-medium">
                      Start: {track.name.split(' - ')[0]}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Nåværende posisjon ved animasjon */}
              {lastPos && animationTime < 100 && (
                <Marker position={lastPos} icon={dogIcon}>
                  <Popup>
                    <div className="text-sm">
                      <strong>{track.name.split(' - ')[0]}</strong>
                      <br />
                      {Math.round(animationTime)}% av sporet
                    </div>
                  </Popup>
                </Marker>
              )}
            </div>
          );
        })}

        {/* Heatmap overlay */}
        {showHeatmap &&
          heatmapData.map((point, i) => (
            <Circle
              key={`heat-${i}`}
              center={[point.lat, point.lng]}
              radius={50 + point.intensity * 100}
              pathOptions={{
                color: 'transparent',
                fillColor: `hsl(${30 - point.intensity * 30}, 100%, 50%)`,
                fillOpacity: 0.3 + point.intensity * 0.4,
                weight: 0,
              }}
            />
          ))}

        {/* Distance measurement tool */}
        <DistanceMeasurer
          isActive={isMeasuring}
          onMeasure={setMeasuredDistance}
        />

        <MapBoundsUpdater tracks={tracks} />
        <ScaleControl position="bottomleft" imperial={false} />
      </MapContainer>

      {/* Kartlag-kontroller */}
      <div className="absolute top-4 left-4 bg-background-light/90 backdrop-blur-sm p-2 rounded shadow z-[1000]">
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showPropertyBoundaries}
              onChange={(e) => setShowPropertyBoundaries(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-text-primary">Eiendom</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showLandUse}
              onChange={(e) => setShowLandUse(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-text-primary">Markslag</span>
          </label>
        </div>
      </div>

      {/* Map tools */}
      <div className="absolute top-16 left-4 flex flex-col gap-2 z-[1000]">
        <button
          onClick={() => {
            setIsMeasuring(!isMeasuring);
            if (isMeasuring) {
              setMeasuredDistance(null);
            }
          }}
          className={`p-2 rounded shadow transition-colors ${
            isMeasuring
              ? 'bg-accent-500 text-white'
              : 'bg-background-light/90 backdrop-blur-sm text-text-muted hover:text-text-primary'
          }`}
          title="Mål avstand"
        >
          <Ruler className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`p-2 rounded shadow transition-colors ${
            showHeatmap
              ? 'bg-accent-500 text-white'
              : 'bg-background-light/90 backdrop-blur-sm text-text-muted hover:text-text-primary'
          }`}
          title="Vis heatmap"
        >
          <Flame className="w-4 h-4" />
        </button>
      </div>

      {/* Measurement result */}
      {isMeasuring && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-accent-500 text-white px-4 py-2 rounded-lg shadow-lg z-[1000] flex items-center gap-2">
          <Ruler className="w-4 h-4" />
          <span className="text-sm font-medium">
            {measuredDistance !== null
              ? `${measuredDistance.toFixed(2)} km`
              : 'Klikk for å måle avstand'}
          </span>
          <button
            onClick={() => {
              setIsMeasuring(false);
              setMeasuredDistance(null);
            }}
            className="ml-2 hover:bg-white/20 p-1 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Sporinfo panel */}
      {selectedTrack && (
        <div className="absolute bottom-4 left-4 right-4 bg-background-light/95 backdrop-blur-sm p-4 rounded-lg shadow-lg max-w-md z-[1000]">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-5 h-5 rounded-full shadow-glow"
              style={{ backgroundColor: selectedTrack.color }}
            />
            <h4 className="font-semibold text-text-primary text-lg">
              {selectedTrack.name.split(' - ')[0]}
            </h4>
            <button
              onClick={() => setSelectedTrack(null)}
              className="ml-auto btn-ghost btn-icon-sm"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-background p-2 rounded">
              <span className="text-text-muted text-xs block">Distanse</span>
              <span className="text-text-primary font-semibold">
                {selectedTrack.statistics.distance_km} km
              </span>
            </div>
            <div className="bg-background p-2 rounded">
              <span className="text-text-muted text-xs block">Varighet</span>
              <span className="text-text-primary font-semibold">
                {Math.round(selectedTrack.statistics.duration_minutes)} min
              </span>
            </div>
            <div className="bg-background p-2 rounded">
              <span className="text-text-muted text-xs block">Snittfart</span>
              <span className="text-text-primary font-semibold">
                {selectedTrack.statistics.avg_speed_kmh} km/t
              </span>
            </div>
            <div className="bg-background p-2 rounded">
              <span className="text-text-muted text-xs block">Høydemeter</span>
              <span className="text-text-primary font-semibold">
                ↑{selectedTrack.statistics.elevation_gain_m}m ↓
                {selectedTrack.statistics.elevation_loss_m}m
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legende for flere spor */}
      {tracks.length > 1 && (
        <div className="absolute top-4 right-16 bg-background-light/95 backdrop-blur-sm p-3 rounded-lg shadow-lg z-[1000]">
          <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">
            Hundespor
          </h4>
          <div className="space-y-1">
            {tracks.map((track) => (
              <button
                key={track.id}
                onClick={() => setSelectedTrack(track)}
                className="flex items-center gap-2 w-full hover:bg-background-lighter p-1 rounded transition-colors"
              >
                <div
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ backgroundColor: track.color }}
                />
                <span className="text-sm text-text-primary">
                  {track.name.split(' - ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Kartinfo */}
      <div className="absolute bottom-4 right-4 bg-background-light/80 backdrop-blur-sm px-2 py-1 rounded shadow text-[10px] text-text-muted z-[1000]">
        <span>© Kartverket</span>
      </div>

      {/* Størrelse-kontroll */}
      <button
        onClick={cycleHeight}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background-light/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg z-[1000] flex items-center gap-2 hover:bg-background-lighter transition-colors"
        title={mapHeight === 'large' ? 'Gjør kartet mindre' : 'Gjør kartet større'}
      >
        {mapHeight === 'large' ? (
          <Minimize2 className="w-4 h-4 text-text-muted" />
        ) : (
          <Maximize2 className="w-4 h-4 text-text-muted" />
        )}
        <span className="text-sm text-text-primary">
          {mapHeight === 'small' ? 'Større kart' : mapHeight === 'medium' ? 'Fullskjerm' : 'Mindre kart'}
        </span>
      </button>
    </div>
  );
}
