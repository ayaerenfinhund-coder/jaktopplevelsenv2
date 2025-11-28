import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Dog,
  Camera,
  Send,
  RefreshCw,
  CheckCircle,
  Thermometer,
  Wind,
  Target,
  Eye,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../components/common/Modal';
import GarminLoginModal from '../components/common/GarminLoginModal';
import toast from 'react-hot-toast';
import { fetchWeatherFromYr } from '../services/weatherService';
import { apiClient } from '../services/apiClient';
import { useAppStore } from '../store/useAppStore';
import { useDogs } from '../hooks/useApi';

// Game types
const gameTypes = [
  { id: 'roe_deer', name: 'Rådyr' },
  { id: 'hare', name: 'Hare' },
  { id: 'moose', name: 'Elg' },
  { id: 'deer', name: 'Hjort' },
  { id: 'grouse', name: 'Rype' },
  { id: 'fox', name: 'Rev' },
];

interface WeatherData {
  temperature: number;
  wind_speed: number;
  wind_direction: string;
  conditions: string;
}

interface GarminTrack {
  id: string;
  dog_id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  distance_km: number;
  duration_minutes: number;
  geojson: any;
  statistics: any;
}

export default function NewHunt() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dogs } = useDogs();

  // Zustand store
  const {
    recentLocations,
    lastSelectedDog,
    setLastSelectedDog,
    lastSelectedLocation,
    setLastSelectedLocation,
    addLocation,
    setLastAutoSyncTime,
  } = useAppStore();

  const activeDogs = dogs.filter((d) => d.is_active);

  // Form state
  const [huntDate, setHuntDate] = useState<Date>(new Date());
  const [quickNote, setQuickNote] = useState('');

  // Time
  const [startTime, setStartTime] = useState(format(new Date(), 'HH:mm'));
  const [endTime, setEndTime] = useState(format(new Date(), 'HH:mm'));

  const [selectedDog, setSelectedDog] = useState(() => {
    return lastSelectedDog || activeDogs[0]?.id || '';
  });
  const [selectedLocation, setSelectedLocation] = useState(() => {
    if (lastSelectedLocation && recentLocations.includes(lastSelectedLocation)) {
      return lastSelectedLocation;
    }
    return recentLocations[0] || '';
  });
  const [customLocation, setCustomLocation] = useState('');

  // Game observations
  const [gameSeen, setGameSeen] = useState<Record<string, number>>({});
  const [gameHarvested, setGameHarvested] = useState<Record<string, number>>({});
  const [showGameModal, setShowGameModal] = useState(false);

  // Weather
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // GPS sync
  const [isSyncing, setIsSyncing] = useState(false);
  const [matchedTrack, setMatchedTrack] = useState<GarminTrack | null>(null);
  const [showTrackConfirm, setShowTrackConfirm] = useState(false);
  const [showGarminLogin, setShowGarminLogin] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Auto-select first dog if available
  useEffect(() => {
    if (!selectedDog && activeDogs.length > 0) {
      setSelectedDog(activeDogs[0].id);
    }
  }, [activeDogs, selectedDog]);

  // Fetch weather automatically
  useEffect(() => {
    const fetchWeather = async () => {
      const loc = selectedLocation === '_custom' ? customLocation : selectedLocation;
      if (!loc || loc.length < 2) {
        setWeather(null);
        return;
      }

      try {
        const searchUrl = `https://ws.geonorge.no/stedsnavn/v1/navn?sok=${encodeURIComponent(loc)}&maxAnt=1&filtrer=navn`;
        const searchResp = await fetch(searchUrl);
        if (searchResp.ok) {
          const searchData = await searchResp.json();
          if (searchData.navn && searchData.navn.length > 0) {
            const place = searchData.navn[0];
            if (place.representasjonspunkt) {
              const coords: [number, number] = [
                place.representasjonspunkt.nord,
                place.representasjonspunkt.øst
              ];

              const weatherData = await fetchWeatherFromYr(coords[0], coords[1]);
              if (weatherData) {
                setWeather({
                  temperature: weatherData.temperature,
                  wind_speed: weatherData.wind_speed,
                  wind_direction: weatherData.wind_direction,
                  conditions: weatherData.conditions,
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Kunne ikke hente vær:', error);
      }
    };

    const timer = setTimeout(fetchWeather, selectedLocation === '_custom' ? 800 : 0);
    return () => clearTimeout(timer);
  }, [selectedLocation, customLocation]);

  // Update Zustand store
  useEffect(() => {
    if (selectedDog) {
      setLastSelectedDog(selectedDog);
    }
  }, [selectedDog, setLastSelectedDog]);

  useEffect(() => {
    if (selectedLocation && selectedLocation !== '_custom') {
      setLastSelectedLocation(selectedLocation);
    }
  }, [selectedLocation, setLastSelectedLocation]);

  const currentDogName = activeDogs.find((d) => d.id === selectedDog)?.name || 'Velg hund';
  const todayDate = new Date().toISOString().split('T')[0];

  const handleGarminSync = async (silent = false) => {
    if (!selectedDog || isSyncing) return;

    setLastAutoSyncTime(Date.now());
    setIsSyncing(true);

    try {
      const activities = await apiClient.getGarminActivities(todayDate, todayDate);

      if (activities && activities.length > 0) {
        const matched = activities.find((act: any) =>
          act.dog_id === selectedDog || act.date === todayDate
        );

        if (matched) {
          setMatchedTrack(matched);
          setShowTrackConfirm(true);

          // Set times from track
          if (matched.start_time) {
            setStartTime(format(new Date(matched.start_time), 'HH:mm'));
            const start = new Date(matched.start_time);
            const end = new Date(start.getTime() + (matched.statistics?.duration_minutes || 120) * 60000);
            setEndTime(format(end, 'HH:mm'));
          }

          if (matched.detected_location) {
            setSelectedLocation(matched.detected_location);
            toast.success(`GPS-spor funnet! Sted: ${matched.detected_location}`);
          } else {
            toast.success(`GPS-spor funnet!`);
          }
        } else if (!silent) {
          toast.success('Synkronisert - ingen nye spor');
        }
      } else if (!silent) {
        toast.success('Synkronisert - ingen nye spor');
      }
    } catch (error: any) {
      if (!silent) {
        if (error.message?.includes('authenticated') || error.status === 401) {
          setShowGarminLogin(true);
        } else {
          toast.error(error.message || 'Kunne ikke synkronisere');
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files);
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const createHuntMutation = useMutation({
    mutationFn: (data: any) => apiClient.createHunt(data),
    onSuccess: async (newHunt) => {
      // Upload photos if any
      if (photos.length > 0) {
        const uploadPromises = photos.map(photo =>
          apiClient.uploadPhoto(photo, newHunt.id)
        );
        const uploadedPhotos = await Promise.all(uploadPromises);

        // Update hunt with photo objects
        await apiClient.updateHunt(newHunt.id, {
          photos: uploadedPhotos
        });
      }

      queryClient.invalidateQueries({ queryKey: ['hunts'] });
      toast.success('Jakttur lagret!');
      navigate('/');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Kunne ikke lagre jakttur');
    },
  });

  const handleSave = async () => {
    const errors: Record<string, string> = {};

    if (!selectedDog) {
      errors.dog = 'Velg en hund';
    }
    if (!selectedLocation && !customLocation) {
      errors.location = 'Velg et sted';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    const finalLocation = selectedLocation === '_custom' ? customLocation : selectedLocation;
    if (selectedLocation === '_custom' && customLocation && !recentLocations.includes(customLocation)) {
      addLocation(customLocation);
      setLastSelectedLocation(customLocation);
    }

    // Build hunt data
    const huntData = {
      title: quickNote || `Jakttur ${format(huntDate, 'dd.MM.yyyy')}`,
      date: format(huntDate, 'yyyy-MM-dd'),
      start_time: startTime,
      end_time: endTime,
      location: {
        name: finalLocation,
        region: '',
        country: 'Norge',
        coordinates: matchedTrack?.geojson?.coordinates?.[0] || [0, 0],
      },
      weather: weather || undefined,
      game_type: Object.keys(gameSeen).concat(Object.keys(gameHarvested)),
      game_seen: Object.entries(gameSeen).map(([type, count]) => ({
        type,
        count,
        time: format(new Date(), 'HH:mm'),
      })),
      game_harvested: Object.entries(gameHarvested).map(([type, count]) => ({
        type,
        count,
        time: format(new Date(), 'HH:mm'),
      })),
      dogs: [selectedDog],
      tracks: matchedTrack ? [matchedTrack.id] : [],
      photos: [], // Photos handled separately
      notes: quickNote,
      tags: [],
      is_favorite: false,
    };

    createHuntMutation.mutate(huntData);
  };

  const updateGameCount = (
    setter: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    gameId: string,
    delta: number
  ) => {
    setter((prev) => {
      const current = prev[gameId] || 0;
      const newValue = Math.max(0, current + delta);
      if (newValue === 0) {
        const { [gameId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [gameId]: newValue };
    });
  };

  const resetGameCount = (gameId: string) => {
    setGameSeen((prev) => {
      const { [gameId]: _, ...rest } = prev;
      return rest;
    });
    setGameHarvested((prev) => {
      const { [gameId]: _, ...rest } = prev;
      return rest;
    });
  };

  const totalSeen = Object.values(gameSeen).reduce((a, b) => a + b, 0);
  const totalHarvested = Object.values(gameHarvested).reduce((a, b) => a + b, 0);

  if (activeDogs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="btn-ghost btn-icon"
            aria-label="Tilbake"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-text-primary">Ny jakttur</h1>
        </div>
        <div className="card p-12 text-center">
          <Dog className="w-12 h-12 mx-auto text-text-muted mb-4" />
          <p className="text-text-muted mb-4">Du må legge til en hund først</p>
          <button
            onClick={() => navigate('/dogs')}
            className="btn-primary"
          >
            Gå til hunder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="btn-ghost btn-icon"
          aria-label="Tilbake"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-text-primary">Ny jakttur</h1>
      </div>

      <div className="bg-background-light rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-text-primary">Registrer detaljer</h2>
          </div>
        </div>

        {/* Date and Time selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Dato</label>
            <input
              type="date"
              value={huntDate.toISOString().split('T')[0]}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setHuntDate(new Date(e.target.value))}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Starttid</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Sluttid</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input text-sm"
            />
          </div>
        </div>

        {/* Dog and Location selectors */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-text-muted mb-1 block">
              Hund {!selectedDog && <span className="text-error">*</span>}
            </label>
            <select
              value={selectedDog}
              onChange={(e) => {
                setSelectedDog(e.target.value);
                if (validationErrors.dog) {
                  setValidationErrors((prev) => {
                    const { dog, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              className={`select text-sm ${validationErrors.dog ? 'border-error ring-1 ring-error' : ''}`}
            >
              <option value="">Velg</option>
              {activeDogs.map((dog) => (
                <option key={dog.id} value={dog.id}>
                  {dog.name}
                </option>
              ))}
            </select>
            {validationErrors.dog && (
              <p className="text-xs text-error mt-1">{validationErrors.dog}</p>
            )}
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">
              Sted {!selectedLocation && !customLocation && <span className="text-error">*</span>}
            </label>
            {selectedLocation === '_custom' ? (
              <div className="relative">
                <input
                  type="text"
                  value={customLocation}
                  onChange={(e) => {
                    setCustomLocation(e.target.value);
                    if (validationErrors.location) {
                      setValidationErrors((prev) => {
                        const { location, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  placeholder="Skriv stedsnavn..."
                  className={`input text-sm pr-8 ${validationErrors.location ? 'border-error ring-1 ring-error' : ''}`}
                  autoFocus
                />
                <button
                  onClick={() => {
                    setSelectedLocation('');
                    setCustomLocation('');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={selectedLocation}
                onChange={(e) => {
                  if (e.target.value === '_custom') {
                    setSelectedLocation('_custom');
                    setCustomLocation('');
                  } else {
                    setSelectedLocation(e.target.value);
                  }
                  if (validationErrors.location) {
                    setValidationErrors((prev) => {
                      const { location, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                className={`select text-sm ${validationErrors.location ? 'border-error ring-1 ring-error' : ''}`}
              >
                <option value="">Velg</option>
                {recentLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
                <option value="_custom">+ Nytt sted</option>
              </select>
            )}
            {validationErrors.location && (
              <p className="text-xs text-error mt-1">{validationErrors.location}</p>
            )}
          </div>
        </div>

        {/* Weather display */}
        {weather && (
          <div className="mb-4 p-3 bg-background rounded-lg flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-primary-400" />
              <span>{weather.temperature}°C</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-primary-400" />
              <span>{weather.wind_speed} m/s {weather.wind_direction}</span>
            </div>
            <span className="text-text-muted">{weather.conditions}</span>
          </div>
        )}

        {/* Notes */}
        <div className="mb-4">
          <label className="text-xs text-text-muted mb-1 block">Notater</label>
          <textarea
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            placeholder="Beskriv jaktturen..."
            className="input text-sm min-h-[120px] resize-none"
          />
        </div>

        {/* Game observations button */}
        <button
          onClick={() => setShowGameModal(true)}
          className="w-full mb-4 p-3 bg-background rounded-lg flex items-center justify-between hover:bg-background-lighter transition-colors"
        >
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-text-muted" />
            <span className="text-sm font-medium text-text-primary">Vilt observert/felt</span>
          </div>
          <div className="flex items-center gap-2">
            {(totalSeen > 0 || totalHarvested > 0) ? (
              <span className="text-sm text-primary-400 font-medium">
                {totalSeen} sett, {totalHarvested} felt
              </span>
            ) : (
              <span className="text-sm text-text-muted">Legg til</span>
            )}
            <Eye className="w-4 h-4 text-text-muted" />
          </div>
        </button>

        {/* Photo upload */}
        <div className="mb-4">
          <label className="text-xs text-text-muted mb-1 block">Bilder</label>
          <div className="flex flex-wrap gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                <img
                  src={URL.createObjectURL(photo)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-lg bg-background border border-dashed border-text-muted/30 flex flex-col items-center justify-center text-text-muted hover:text-text-primary hover:border-text-primary transition-colors"
            >
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Legg til</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              multiple
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {/* GPS track confirmation */}
        {showTrackConfirm && matchedTrack && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="font-semibold">{currentDogName}</span>
              <span className="text-text-muted">•</span>
              <span>{matchedTrack.distance_km} km</span>
              <span className="text-text-muted">•</span>
              <span>
                {Math.round(matchedTrack.duration_minutes / 60)}t{' '}
                {matchedTrack.duration_minutes % 60}m
              </span>
              <button
                onClick={() => {
                  setMatchedTrack(null);
                  setShowTrackConfirm(false);
                }}
                className="text-xs text-text-muted hover:text-text-primary ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-2">
          {!matchedTrack && (
            <div className="flex flex-col items-center w-full">
              <button
                onClick={() => handleGarminSync()}
                disabled={isSyncing || !selectedDog}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-text-muted hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-dashed border-text-muted/30 rounded-lg mb-2"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Synkroniserer...' : 'Synk med Garmin'}
              </button>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={createHuntMutation.isPending || !selectedDog || (!selectedLocation && !customLocation)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-700 hover:bg-primary-600 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-700/20"
          >
            <Send className="w-4 h-4" />
            {createHuntMutation.isPending ? 'Lagrer...' : 'Lagre jakttur'}
          </button>
        </div>
      </div>

      {/* Game modal */}
      <Modal
        isOpen={showGameModal}
        onClose={() => setShowGameModal(false)}
        title="Vilt observert og felt"
        size="lg"
      >
        <div className="space-y-6">
          <div className="space-y-3">
            {gameTypes
              .filter((g) => (gameSeen[g.id] || 0) > 0 || (gameHarvested[g.id] || 0) > 0)
              .map((game) => {
                const seen = gameSeen[game.id] || 0;
                const harvested = gameHarvested[game.id] || 0;
                return (
                  <div key={game.id} className="bg-background rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-text-primary">{game.name}</span>
                      <button
                        onClick={() => resetGameCount(game.id)}
                        className="text-text-muted hover:text-error transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Seen */}
                      <div className="bg-background-lighter rounded-lg p-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-text-secondary">Sett</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateGameCount(setGameSeen, game.id, -1)}
                            className="w-8 h-8 rounded bg-background text-text-muted hover:text-text-primary flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-medium text-primary-400">{seen}</span>
                          <button
                            onClick={() => updateGameCount(setGameSeen, game.id, 1)}
                            className="w-8 h-8 rounded bg-background text-text-muted hover:text-text-primary flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Harvested */}
                      <div className="bg-background-lighter rounded-lg p-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-text-secondary">Felt</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateGameCount(setGameHarvested, game.id, -1)}
                            className="w-8 h-8 rounded bg-background text-text-muted hover:text-text-primary flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-medium text-success">{harvested}</span>
                          <button
                            onClick={() => updateGameCount(setGameHarvested, game.id, 1)}
                            className="w-8 h-8 rounded bg-background text-text-muted hover:text-text-primary flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            {!gameTypes.some((g) => (gameSeen[g.id] || 0) > 0 || (gameHarvested[g.id] || 0) > 0) && (
              <div className="text-center py-8 text-text-muted bg-background-lighter/50 rounded-lg border border-dashed border-text-muted/20">
                <p>Ingen vilt registrert enda</p>
                <p className="text-xs mt-1">Velg en art nedenfor for å legge til</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Legg til art</h3>
            <div className="grid grid-cols-3 gap-2">
              {gameTypes
                .filter((g) => !((gameSeen[g.id] || 0) > 0 || (gameHarvested[g.id] || 0) > 0))
                .map((game) => (
                  <button
                    key={game.id}
                    onClick={() => updateGameCount(setGameSeen, game.id, 0)}
                    className="p-3 bg-background-lighter hover:bg-primary-500/10 hover:text-primary-400 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-primary-500/20 text-left"
                  >
                    + {game.name}
                  </button>
                ))}
            </div>
          </div>

          <div className="pt-4 border-t border-background-lighter">
            <button
              onClick={() => setShowGameModal(false)}
              className="w-full py-3 bg-primary-700 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
            >
              Ferdig
            </button>
          </div>
        </div>
      </Modal>

      {/* Garmin Login Modal */}
      <GarminLoginModal
        isOpen={showGarminLogin}
        onClose={() => setShowGarminLogin(false)}
        onSuccess={() => handleGarminSync()}
      />
    </div>
  );
}
