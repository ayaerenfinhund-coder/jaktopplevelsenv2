import { useState } from 'react';
import { ArrowLeft, TrendingUp, Calendar, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useDogs, useHunts } from '../hooks/useApi';

export default function DogStatistics() {
  const navigate = useNavigate();
  const { dogs, isLoading: dogsLoading } = useDogs();
  const { data: hunts = [], isLoading: huntsLoading } = useHunts();

  const [selectedDog, setSelectedDog] = useState('');

  // Calculate statistics from real hunt data
  const calculateDogStats = (dogId: string) => {
    const dogHunts = hunts.filter((h: any) => h.dogs.includes(dogId));

    const stats = dogHunts.map((hunt: any) => {
      const tracks = hunt.tracks || [];
      const totalDistance = tracks.reduce((sum: number, track: any) =>
        sum + (track.statistics?.distance_km || 0), 0
      );

      return {
        date: hunt.date,
        location: hunt.location.name,
        distance_km: totalDistance,
        duration_minutes: tracks.reduce((sum: number, track: any) =>
          sum + (track.statistics?.duration_minutes || 0), 0
        ),
        game_seen: hunt.game_seen.reduce((sum: number, g: any) => sum + g.count, 0),
        game_harvested: hunt.game_harvested.reduce((sum: number, g: any) => sum + g.count, 0),
      };
    });

    const totalDistance = stats.reduce((sum, s) => sum + s.distance_km, 0);
    const totalDuration = stats.reduce((sum, s) => sum + s.duration_minutes, 0);
    const avgDistance = stats.length > 0 ? totalDistance / stats.length : 0;

    return {
      history: stats,
      summary: {
        total_hunts: dogHunts.length,
        total_distance: totalDistance,
        total_duration: totalDuration,
        avg_distance: avgDistance,
        total_seen: stats.reduce((sum, s) => sum + s.game_seen, 0),
        total_harvested: stats.reduce((sum, s) => sum + s.game_harvested, 0),
      }
    };
  };

  const activeDogs = dogs.filter((d) => d.is_active);
  const dog = activeDogs.find((d) => d.id === selectedDog);
  const dogStats = selectedDog ? calculateDogStats(selectedDog) : null;

  // Auto-select first dog
  if (!selectedDog && activeDogs.length > 0) {
    setSelectedDog(activeDogs[0].id);
  }

  if (dogsLoading || huntsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-muted">Laster statistikk...</p>
      </div>
    );
  }

  if (activeDogs.length === 0) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Tilbake
        </button>
        <div className="card p-12 text-center">
          <p className="text-text-muted mb-4">Ingen hunder registrert ennå</p>
          <button
            onClick={() => navigate('/dogs')}
            className="btn-primary"
          >
            Legg til hund
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Tilbake
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-text-primary">Hundestatistikk</h1>
        <p className="text-text-secondary mt-1">
          Detaljert oversikt over jaktaktivitet
        </p>
      </div>

      {/* Dog selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {activeDogs.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDog(d.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${selectedDog === d.id
              ? 'bg-primary-700 text-white'
              : 'bg-background-light text-text-secondary hover:bg-background-lighter'
              }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {dog && dogStats && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-sm text-text-muted mb-1">Totalt jaktturer</p>
              <p className="text-2xl font-bold text-text-primary">
                {dogStats.summary.total_hunts}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-text-muted mb-1">Total distanse</p>
              <p className="text-2xl font-bold text-text-primary">
                {dogStats.summary.total_distance.toFixed(1)} km
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-text-muted mb-1">Gjennomsnitt</p>
              <p className="text-2xl font-bold text-text-primary">
                {dogStats.summary.avg_distance.toFixed(1)} km
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-text-muted mb-1">Vilt sett/felt</p>
              <p className="text-2xl font-bold text-text-primary">
                {dogStats.summary.total_seen}/{dogStats.summary.total_harvested}
              </p>
            </div>
          </div>

          {/* History */}
          <div className="card">
            <div className="p-4 border-b border-background-lighter">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Jakthistorikk
              </h2>
            </div>
            <div className="p-4">
              {dogStats.history.length === 0 ? (
                <p className="text-center text-text-muted py-8">
                  Ingen jaktturer registrert for {dog.name} ennå
                </p>
              ) : (
                <div className="space-y-3">
                  {dogStats.history.map((entry, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-background rounded-lg hover:bg-background-lighter transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm text-text-muted">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(entry.date), 'd. MMMM yyyy', { locale: nb })}
                        </div>
                        <div className="text-sm font-medium text-primary-400">
                          {entry.distance_km.toFixed(1)} km
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <MapPin className="w-4 h-4" />
                        {entry.location}
                      </div>
                      {(entry.game_seen > 0 || entry.game_harvested > 0) && (
                        <div className="mt-2 flex gap-4 text-xs">
                          {entry.game_seen > 0 && (
                            <span className="text-primary-400">
                              {entry.game_seen} sett
                            </span>
                          )}
                          {entry.game_harvested > 0 && (
                            <span className="text-success">
                              {entry.game_harvested} felt
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
