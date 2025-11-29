import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Dog,
  Thermometer,
  Wind,
  Eye,
  Target,
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  CloudFog,
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import LoadingSpinner from '../components/common/LoadingSpinner';
import HuntMap from '../components/maps/HuntMap';
import type { Hunt, Track } from '../types';

export default function PublicHuntView() {
  const { shareId } = useParams<{ shareId: string }>();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedHunt = async () => {
      setIsLoading(true);
      try {
        if (!shareId) {
          setError('Ugyldig delingslenke');
          setIsLoading(false);
          return;
        }

        // Fetch the actual hunt from Firestore using shareId
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');

        // The shareId is the hunt ID
        const huntRef = doc(db, 'hunts', shareId);
        const huntSnap = await getDoc(huntRef);

        if (!huntSnap.exists()) {
          setError('Jakttur ikke funnet');
          setIsLoading(false);
          return;
        }

        const huntData = { id: huntSnap.id, ...huntSnap.data() } as Hunt;
        setHunt(huntData);

        // Fetch tracks if the hunt has any
        if (huntData.tracks && huntData.tracks.length > 0) {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const tracksRef = collection(db, 'tracks');
          const q = query(tracksRef, where('hunt_id', '==', shareId));
          const tracksSnap = await getDocs(q);

          const tracksData = tracksSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Track[];

          setTracks(tracksData);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading shared hunt:', err);
        setError('Kunne ikke laste jakttur');
        setIsLoading(false);
      }
    };

    loadSharedHunt();
  }, [shareId]);

  const gameTypeLabels: Record<string, string> = {
    moose: 'Elg',
    deer: 'Hjort',
    roe_deer: 'Rådyr',
    hare: 'Hare',
    grouse: 'Rype',
    fox: 'Rev',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }



  if (error || !hunt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Jakttur ikke funnet
          </h1>
          <p className="text-text-muted mb-4">{error || 'Denne lenken er ugyldig eller utløpt'}</p>
          <Link
            to="/"
            className="text-primary-400 hover:text-primary-300"
          >
            Gå til hovedsiden
          </Link>
        </div>
      </div>
    );
  }

  const totalSeen = hunt.game_seen.reduce((acc, g) => acc + g.count, 0);
  const totalHarvested = hunt.game_harvested.reduce((acc, g) => acc + g.count, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background-light border-b border-background-lighter p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Jaktopplevelsen"
              className="w-10 h-10 rounded-lg object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <span className="text-lg font-bold text-text-primary">Jaktopplevelsen</span>
          </div>
          <span className="text-xs text-text-muted bg-background-lighter px-2 py-1 rounded">
            Delt jakttur
          </span>
        </div>
      </header>

      {/* Innhold */}
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Tittel og dato */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">{hunt.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(hunt.date), 'd. MMMM yyyy', { locale: nb })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {hunt.start_time} - {hunt.end_time}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {hunt.location.name}
            </span>
          </div>
        </div>

        {/* Kart */}
        {tracks.length > 0 && (
          <div className="card overflow-hidden">
            <HuntMap
              tracks={tracks}
              center={[hunt.location.coordinates[0], hunt.location.coordinates[1]]}
              zoom={14}
              initialHeight="medium"
            />
          </div>
        )}

        {/* Notater - RETT ETTER KART */}
        {hunt.notes && (
          <div className="card p-4">
            <h3 className="text-sm font-medium text-text-muted mb-3">Notater</h3>
            <p className="text-text-secondary text-sm whitespace-pre-wrap">{hunt.notes}</p>
          </div>
        )}

        {/* Statistikk */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <Eye className="w-5 h-5 text-primary-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-text-primary">{totalSeen}</p>
            <p className="text-xs text-text-muted">Observert</p>
          </div>
          <div className="card p-4 text-center">
            <Target className="w-5 h-5 text-success mx-auto mb-1" />
            <p className="text-xl font-bold text-text-primary">{totalHarvested}</p>
            <p className="text-xs text-text-muted">Felt</p>
          </div>
          {tracks[0] && (
            <>
              <div className="card p-4 text-center">
                <Dog className="w-5 h-5 text-accent-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-text-primary">
                  {tracks[0].statistics.distance_km.toFixed(1)} km
                </p>
                <p className="text-xs text-text-muted">Distanse</p>
              </div>
              <div className="card p-4 text-center">
                <Clock className="w-5 h-5 text-text-muted mx-auto mb-1" />
                <p className="text-xl font-bold text-text-primary">
                  {Math.floor(tracks[0].statistics.duration_minutes / 60)}t {Math.round(tracks[0].statistics.duration_minutes % 60)}m
                </p>
                <p className="text-xs text-text-muted">Varighet</p>
              </div>
            </>
          )}
        </div>

        {/* Vær */}
        {hunt.weather && (
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              {(() => {
                const condition = hunt.weather.conditions;
                if (condition === 'clear') {
                  return <Sun className="w-6 h-6 text-yellow-400" />;
                } else if (condition.includes('rain')) {
                  return <CloudRain className="w-6 h-6 text-blue-400" />;
                } else if (condition.includes('snow')) {
                  return <CloudSnow className="w-6 h-6 text-blue-200" />;
                } else if (condition === 'fog') {
                  return <CloudFog className="w-6 h-6 text-gray-400" />;
                } else {
                  return <Cloud className="w-6 h-6 text-gray-400" />;
                }
              })()}
              <div>
                <h3 className="text-base font-semibold text-text-primary">
                  {(() => {
                    const labels: Record<string, string> = {
                      clear: 'Klart vær',
                      cloudy: 'Lettskyet',
                      overcast: 'Overskyet',
                      rain: 'Regn',
                      snow: 'Snø',
                      fog: 'Tåke',
                    };
                    return labels[hunt.weather.conditions] || hunt.weather.conditions;
                  })()}
                </h3>
                <p className="text-sm text-text-muted">Værforhold under jakten</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-accent-400" />
                <div>
                  <p className="text-xs text-text-muted">Temperatur</p>
                  <p className="text-base font-medium text-text-primary">{hunt.weather.temperature}°C</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-accent-400" />
                <div>
                  <p className="text-xs text-text-muted">Vind</p>
                  <p className="text-base font-medium text-text-primary">{hunt.weather.wind_speed} m/s {hunt.weather.wind_direction}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vilt */}
        {(hunt.game_seen.length > 0 || hunt.game_harvested.length > 0) && (
          <div className="card p-4">
            <h3 className="text-sm font-medium text-text-muted mb-3">Vilt</h3>
            <div className="grid grid-cols-2 gap-4">
              {hunt.game_seen.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted mb-2">Observert</p>
                  <div className="space-y-1">
                    {hunt.game_seen.map((g) => (
                      <div key={g.type} className="flex justify-between text-sm">
                        <span className="text-text-secondary">{gameTypeLabels[g.type] || g.type}</span>
                        <span className="text-text-primary font-medium">{g.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {hunt.game_harvested.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted mb-2">Felt</p>
                  <div className="space-y-1">
                    {hunt.game_harvested.map((g) => (
                      <div key={g.type} className="flex justify-between text-sm">
                        <span className="text-text-secondary">{gameTypeLabels[g.type] || g.type}</span>
                        <span className="text-success font-medium">{g.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hunder */}
        {tracks.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-medium text-text-muted mb-3">Hunder</h3>
            <div className="space-y-2">
              {tracks.map((track) => {
                const dogName = track.name.split(' - ')[0];
                return (
                  <div key={track.id} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: track.color }}
                    >
                      {dogName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{dogName}</p>
                      <p className="text-xs text-text-muted">
                        {track.statistics.distance_km.toFixed(1)} km • {Math.floor(track.statistics.duration_minutes / 60)}t {track.statistics.duration_minutes % 60}m
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-background-light border-t border-background-lighter p-4 mt-8">
        <div className="max-w-4xl mx-auto text-center text-xs text-text-muted">
          Delt via Jaktopplevelsen • {format(new Date(), 'd. MMM yyyy', { locale: nb })}
        </div>
      </footer>
    </div>
  );
}
