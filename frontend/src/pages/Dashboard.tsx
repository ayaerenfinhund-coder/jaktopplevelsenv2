import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  MapPin,
  Dog,
  Camera,
  Send,
  RefreshCw,
  CheckCircle,
  Thermometer,
  Wind,
  Target,
  Eye,
  Upload,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Image,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import Modal from '../components/common/Modal';
import { HuntCardSkeleton } from '../components/common/Skeleton';
import GarminLoginModal from '../components/common/GarminLoginModal';
import toast from 'react-hot-toast';
import { apiClient } from '../services/apiClient';
import { useAppStore } from '../store/useAppStore';
import type { Hunt } from '../types';

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

// Get hunting season for a date (Aug 20 - Apr 15)
function getHuntingSeason(date: string): string {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  if (month < 8 || (month === 8 && d.getDate() < 20)) {
    return `${year - 1}/${year}`;
  }
  return `${year}/${year + 1}`;
}



export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterGame, setFilterGame] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDog, setFilterDog] = useState('');

  // Zustand store for shared state
  const {
    dogs,
    recentLocations,
    lastSelectedDog,
    setLastSelectedDog,
    lastSelectedLocation,
    setLastSelectedLocation,
    addLocation,
    lastAutoSyncTime,
    setLastAutoSyncTime,
    quickFilterActive,
  } = useAppStore();

  // Only active dogs for selection
  const activeDogs = dogs.filter((d) => d.is_active);

  // Season filtering
  const [selectedSeason, setSelectedSeason] = useState<string>(() => {
    return getHuntingSeason(new Date().toISOString().split('T')[0]);
  });

  // Quick registration form
  const [quickNote, setQuickNote] = useState('');
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

  // Weather
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  // GPS sync
  const [isSyncing, setIsSyncing] = useState(false);
  const [matchedTrack, setMatchedTrack] = useState<GarminTrack | null>(null);
  const [showTrackConfirm, setShowTrackConfirm] = useState(false);
  const [showGarminLogin, setShowGarminLogin] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Game modal
  const [showGameModal, setShowGameModal] = useState(false);

  // Date picker
  const [huntDate, setHuntDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form validation
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Draft auto-save
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const DRAFT_KEY = 'jaktopplevelsen_hunt_draft';

  const hasInitialSynced = useRef(false);
  const MIN_SYNC_INTERVAL = 1800000; // 30 minutes

  // REAL DATA: Fetch hunts from API
  const { data: hunts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['hunts'],
    queryFn: () => apiClient.getHunts({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (error) {
      console.error("Dashboard fetch error:", error);
      toast.error(`Kunne ikke laste turer: ${(error as any).message}`);
    }
    if (hunts.length > 0) {
      console.log("Loaded hunts:", hunts);
    }
  }, [hunts, error]);

  // REAL DATA: Create hunt mutation
  const createHuntMutation = useMutation({
    mutationFn: (data: any) => apiClient.createHunt(data),
    onSuccess: async (newHunt) => {
      // Upload photos if any
      if (photos.length > 0) {
        const uploadPromises = photos.map(photo =>
          apiClient.uploadPhoto(photo, newHunt.id)
        );
        const uploadedPhotos = await Promise.all(uploadPromises);

        // Update hunt with photo objects (not just URLs)
        await apiClient.updateHunt(newHunt.id, {
          photos: uploadedPhotos
        });
      }

      queryClient.invalidateQueries({ queryKey: ['hunts'] });
      toast.success('Jakttur lagret!');
      clearForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Kunne ikke lagre jakttur');
    },
  });

  // Check for saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.quickNote || Object.keys(draft.gameSeen || {}).length > 0) {
          setHasDraft(true);
          setShowDraftBanner(true);
        }
      } catch (e) {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    const saveDraft = () => {
      const draft = {
        quickNote,
        selectedDog,
        selectedLocation,
        customLocation,
        gameSeen,
        gameHarvested,
        huntDate: huntDate.toISOString(),
        savedAt: Date.now(),
      };

      if (quickNote || Object.keys(gameSeen).length > 0) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setHasDraft(true);
      }
    };

    const timer = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timer);
  }, [quickNote, selectedDog, selectedLocation, customLocation, gameSeen, gameHarvested, huntDate]);

  const restoreDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setQuickNote(draft.quickNote || '');
        if (draft.selectedDog) setSelectedDog(draft.selectedDog);
        if (draft.selectedLocation) setSelectedLocation(draft.selectedLocation);
        if (draft.customLocation) setCustomLocation(draft.customLocation);
        if (draft.gameSeen) setGameSeen(draft.gameSeen);
        if (draft.gameHarvested) setGameHarvested(draft.gameHarvested);
        if (draft.huntDate) setHuntDate(new Date(draft.huntDate));
        setShowDraftBanner(false);
        toast.success('Kladd gjenopprettet');
      } catch (e) {
        toast.error('Kunne ikke gjenopprette kladd');
      }
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
    setShowDraftBanner(false);
  };

  const clearForm = () => {
    setQuickNote('');
    setCustomLocation('');
    setMatchedTrack(null);
    setShowTrackConfirm(false);
    setGameSeen({});
    setGameHarvested({});
    clearDraft();
  };

  // Fetch weather automatically
  useEffect(() => {
    const fetchWeather = async () => {
      const loc = selectedLocation === '_custom' ? customLocation : selectedLocation;
      if (!loc || loc.length < 2) {
        setWeather(null);
        return;
      }

      // Try to geocode location name to coordinates
      setIsLoadingWeather(true);
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

              // Kombiner jaktdato med starttid for å få riktig tidspunkt
              const huntDateTime = new Date(huntDate);
              if (matchedTrack?.start_time) {
                const [hours, minutes] = matchedTrack.start_time.split(':');
                huntDateTime.setHours(parseInt(hours), parseInt(minutes));
              } else {
                // Default til 06:00 hvis ingen starttid
                huntDateTime.setHours(6, 0);
              }

              // Hent værdata for det faktiske jakttidspunktet
              const { fetchWeatherForTime } = await import('../services/weatherService');
              const weatherData = await fetchWeatherForTime(coords[0], coords[1], huntDateTime);
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
      } finally {
        setIsLoadingWeather(false);
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

  // REAL: Sync with Garmin
  const handleGarminSync = async (silent = false) => {
    if (!silent) {
      toast('Automatisk synkronisering er ikke tilgjengelig. Vennligst last opp GPX-fil manuelt under Innstillinger -> Garmin.', {
        icon: 'ℹ️',
        duration: 5000,
      });
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

  // Time
  const [startTime, setStartTime] = useState(format(new Date(), 'HH:mm'));
  const [endTime, setEndTime] = useState(format(new Date(), 'HH:mm'));

  // GPX Upload Handler
  const gpxInputRef = useRef<HTMLInputElement>(null);

  const handleGpxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const toastId = toast.loading('Analyserer GPX-fil...');

      try {
        const trackData = await apiClient.uploadGpx(file);

        setMatchedTrack(trackData);
        setShowTrackConfirm(true);

        // Set start time from track if available
        if (trackData.start_time) {
          setStartTime(format(new Date(trackData.start_time), 'HH:mm'));
          // Estimate end time based on duration (if available) or add 2 hours
          const start = new Date(trackData.start_time);
          const end = new Date(start.getTime() + (trackData.statistics?.duration_minutes || 120) * 60000);
          setEndTime(format(end, 'HH:mm'));
        }

        toast.success('GPX-fil lastet opp!', { id: toastId });
      } catch (error: any) {
        console.error('GPX upload error:', error);
        toast.error(error.message || 'Kunne ikke lese GPX-fil', { id: toastId });
      } finally {
        // Reset input
        if (gpxInputRef.current) gpxInputRef.current.value = '';
      }
    }
  };

  // Auto-sync on mount
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastSync = now - lastAutoSyncTime;

    // Only auto-sync if we have a selected dog and enough time has passed
    if (selectedDog && timeSinceLastSync > MIN_SYNC_INTERVAL && !hasInitialSynced.current) {
      hasInitialSynced.current = true;
      handleGarminSync(true);
    }
  }, [selectedDog, lastAutoSyncTime]);

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
    const huntData: any = {
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
      notes: quickNote || '',
      tags: [],
      is_favorite: false,
    };

    // Only add weather if it exists (Firestore doesn't allow undefined)
    if (weather) {
      huntData.weather = weather;
    }

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

  // Filter logic
  const filteredHunts = hunts.filter((hunt: any) => {
    const matchesSearch =
      hunt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hunt.location.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    let matchesQuickFilter = true;
    if (quickFilterActive === 'season') {
      const currentSeason = getHuntingSeason(new Date().toISOString().split('T')[0]);
      matchesQuickFilter = getHuntingSeason(hunt.date) === currentSeason;
    } else if (quickFilterActive === 'photos') {
      matchesQuickFilter = Array.isArray(hunt.photos) && hunt.photos.length > 0;
    }

    const matchesSeason = getHuntingSeason(hunt.date) === selectedSeason;
    const matchesGame = !filterGame || hunt.game_type.includes(filterGame as any);
    const matchesLocation = !filterLocation || hunt.location.name === filterLocation;
    const matchesDog = !filterDog || hunt.dogs.includes(filterDog);

    return matchesSearch && matchesQuickFilter && matchesSeason && matchesGame && matchesLocation && matchesDog;
  });

  const totalSeen = Object.values(gameSeen).reduce((a, b) => a + b, 0);
  const totalHarvested = Object.values(gameHarvested).reduce((a, b) => a + b, 0);

  // Get available seasons
  const availableSeasons = Array.from(
    new Set(hunts.map((h: Hunt) => getHuntingSeason(h.date)))
  ).sort().reverse();

  const navigateSeason = (direction: 'prev' | 'next') => {
    const currentIndex = availableSeasons.indexOf(selectedSeason);
    if (direction === 'prev' && currentIndex < availableSeasons.length - 1) {
      setSelectedSeason(availableSeasons[currentIndex + 1]);
    } else if (direction === 'next' && currentIndex > 0) {
      setSelectedSeason(availableSeasons[currentIndex - 1]);
    }
  };

  // Calculate season stats
  const seasonStats = {
    total_hunts: filteredHunts.length,
    total_seen: filteredHunts.reduce(
      (acc, h) => acc + h.game_seen.reduce((a, g) => a + g.count, 0),
      0
    ),
    total_harvested: filteredHunts.reduce(
      (acc, h) => acc + h.game_harvested.reduce((a, g) => a + g.count, 0),
      0
    ),
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Draft recovery banner */}
      {showDraftBanner && (
        <div className="bg-primary-700/20 border border-primary-700/40 rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm text-text-primary">
            <span className="font-medium">Ulagret kladd funnet</span>
            <span className="text-text-muted ml-2">Vil du gjenopprette?</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={restoreDraft}
              className="text-xs bg-primary-700 text-white px-3 py-1 rounded hover:bg-primary-600 transition-colors"
            >
              Gjenopprett
            </button>
            <button
              onClick={() => {
                clearDraft();
                setShowDraftBanner(false);
              }}
              className="text-xs text-text-muted hover:text-error transition-colors"
            >
              Forkast
            </button>
          </div>
        </div>
      )}

      {/* Quick registration form - CONTINUES IN NEXT MESSAGE DUE TO LENGTH */}
      <div className="p-5 bg-background-light rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-text-primary">Hurtigregistrering</h2>
            {showDraftBanner && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium animate-pulse">
                Kladd lagret
              </span>
            )}
          </div>
          {showDraftBanner && (
            <button
              onClick={restoreDraft}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium underline"
            >
              Fortsett
            </button>
          )}
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
                {recentLocations.length > 0 ? (
                  recentLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Ingen lagrede steder</option>
                )}
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
            {(Object.values(gameSeen).reduce((a, b) => a + b, 0) > 0 || Object.values(gameHarvested).reduce((a, b) => a + b, 0) > 0) ? (
              <span className="text-sm text-primary-400 font-medium">
                {Object.values(gameSeen).reduce((a, b) => a + b, 0)} sett, {Object.values(gameHarvested).reduce((a, b) => a + b, 0)} felt
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
            <div className="flex flex-col items-center w-full gap-2">
              <button
                onClick={() => handleGarminSync()}
                disabled={isSyncing || !selectedDog}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-text-muted hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-dashed border-text-muted/30 rounded-lg"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Synkroniserer...' : 'Synk med Garmin'}
              </button>

              <div className="flex items-center gap-2 w-full">
                <div className="h-px bg-text-muted/20 flex-1" />
                <span className="text-[10px] text-text-muted uppercase">Eller</span>
                <div className="h-px bg-text-muted/20 flex-1" />
              </div>

              <button
                onClick={() => gpxInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-text-muted hover:text-text-primary transition-colors border border-dashed border-text-muted/30 rounded-lg"
              >
                <Upload className="w-4 h-4" />
                Last opp GPX-fil
              </button>
              <input
                type="file"
                ref={gpxInputRef}
                onChange={handleGpxUpload}
                accept=".gpx"
                className="hidden"
              />
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={createHuntMutation.isPending || !selectedDog || (!selectedLocation && !customLocation)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-700 hover:bg-primary-600 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-700/20 mt-2"
          >
            <Send className="w-4 h-4" />
            {createHuntMutation.isPending ? 'Lagrer...' : 'Lagre jakttur'}
          </button>
        </div>
      </div>

      {/* Hunt history section */}
      <div id="hunt-history" className="p-4 bg-background-light rounded-xl space-y-4">
        {/* Season navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateSeason('prev')}
            disabled={availableSeasons.indexOf(selectedSeason) === availableSeasons.length - 1}
            className="p-2 text-text-muted hover:text-primary-400 transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="text-xl font-bold text-text-primary mb-1">
              Sesong {selectedSeason}
            </div>
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-text-primary font-medium">{seasonStats.total_hunts} turer</span>
              <span className="text-text-muted">•</span>
              <span className="text-primary-400">{seasonStats.total_seen} sett</span>
              <span className="text-text-muted">•</span>
              <span className="text-success">{seasonStats.total_harvested} felt</span>
            </div>
          </div>

          <button
            onClick={() => navigateSeason('next')}
            disabled={availableSeasons.indexOf(selectedSeason) === 0}
            className="p-2 text-text-muted hover:text-primary-400 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Search and filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Søk i jaktturer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border-none rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-primary-700/30 text-primary-400' : 'bg-background text-text-muted hover:text-text-primary'
              }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="space-y-2 pt-2 border-t border-background-lighter">
            <div className="grid grid-cols-3 gap-2">
              <select
                value={filterGame}
                onChange={(e) => setFilterGame(e.target.value)}
                className="bg-background text-sm rounded-lg px-2 py-1.5 text-text-primary border-none"
              >
                <option value="">Vilt</option>
                {gameTypes.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="bg-background text-sm rounded-lg px-2 py-1.5 text-text-primary border-none"
              >
                <option value="">Sted</option>
                {recentLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <select
                value={filterDog}
                onChange={(e) => setFilterDog(e.target.value)}
                className="bg-background text-sm rounded-lg px-2 py-1.5 text-text-primary border-none"
              >
                <option value="">Hund</option>
                {activeDogs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            {(filterGame || filterLocation || filterDog) && (
              <button
                onClick={() => {
                  setFilterGame('');
                  setFilterLocation('');
                  setFilterDog('');
                }}
                className="text-xs text-text-muted hover:text-error transition-colors"
              >
                Nullstill filtre
              </button>
            )}
          </div>
        )}

        {/* Link to statistics */}
        <div className="text-center pt-2 border-t border-background-lighter">
          <button
            onClick={() => navigate('/statistics')}
            className="text-xs text-primary-400 hover:text-primary-300"
          >
            Se hundestatistikk →
          </button>
        </div>
      </div>

      {/* Hunt list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <HuntCardSkeleton />
            <HuntCardSkeleton />
            <HuntCardSkeleton />
          </div>
        ) : filteredHunts.length === 0 ? (
          <div className="card p-8 text-center">
            <MapPin className="w-10 h-10 mx-auto text-text-muted mb-3" />
            <p className="text-text-muted">
              {hunts.length === 0
                ? 'Ingen jaktturer ennå. Registrer din første jakttur!'
                : 'Ingen jaktturer matcher filtrene'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHunts.map((hunt: Hunt) => (
              <div
                key={hunt.id}
                onClick={() => navigate(`/hunt/${hunt.id}`)}
                className="card-hover p-4 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-text-primary">{hunt.title}</h3>
                  <span className="text-xs text-text-muted">
                    {format(new Date(hunt.date), 'dd.MM.yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-text-muted">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {hunt.location.name}
                  </div>
                  {hunt.dogs.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Dog className="w-4 h-4" />
                      {hunt.dogs.length}
                    </div>
                  )}
                  {hunt.photos && hunt.photos.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Camera className="w-4 h-4" />
                      {hunt.photos.length}
                    </div>
                  )}
                </div>
                {(hunt.game_seen.length > 0 || hunt.game_harvested.length > 0) && (
                  <div className="mt-2 flex gap-4 text-xs">
                    {hunt.game_seen.length > 0 && (
                      <span className="text-primary-400">
                        {hunt.game_seen.reduce((a, g) => a + g.count, 0)} sett
                      </span>
                    )}
                    {hunt.game_harvested.length > 0 && (
                      <span className="text-success">
                        {hunt.game_harvested.reduce((a, g) => a + g.count, 0)} felt
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
