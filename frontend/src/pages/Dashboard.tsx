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
  Trash2,
  Zap,
  Trophy,
  Activity,
  Thermometer,
  Wind,
  Target,
  CheckCircle,
  Calendar,
  Image as ImageIcon,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import SeasonStatsChart from '../components/dashboard/SeasonStatsChart';
import AuroraBackground from '../components/common/AuroraBackground';
import TiltCard from '../components/common/TiltCard';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import { DatePicker, TimePicker } from '../components/common/CustomPickers';
import Modal from '../components/common/Modal';
import { HuntCardSkeleton } from '../components/common/Skeleton';
import GarminLoginModal from '../components/common/GarminLoginModal';
import toast from 'react-hot-toast';
import { apiClient } from '../services/apiClient';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
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
  const { user } = useAuth();

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

  // GPS sync
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

  // Form validation
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Draft auto-save
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const DRAFT_KEY = 'jaktopplevelsen_hunt_draft';

  const hasInitialSynced = useRef(false);
  const MIN_SYNC_INTERVAL = 1800000; // 30 minutes

  // REAL DATA: Fetch hunts from API
  const { data: hunts = [], isLoading, error } = useQuery({
    queryKey: ['hunts'],
    queryFn: () => apiClient.getHunts({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (error) {
      console.error("Dashboard fetch error:", error);
      toast.error(`Kunne ikke laste turer: ${(error as any).message}`);
    }
  }, [error]);

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

      // Confetti explosion
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#eab308', '#10b981', '#ffffff']
      });

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

              const huntDateTime = new Date(huntDate);
              if (matchedTrack?.start_time) {
                const [hours, minutes] = matchedTrack.start_time.split(':');
                huntDateTime.setHours(parseInt(hours), parseInt(minutes));
              } else {
                huntDateTime.setHours(6, 0);
              }

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

        if (trackData.start_time) {
          setStartTime(format(new Date(trackData.start_time), 'HH:mm'));
          const start = new Date(trackData.start_time);
          const end = new Date(start.getTime() + (trackData.statistics?.duration_minutes || 120) * 60000);
          setEndTime(format(end, 'HH:mm'));
        }

        toast.success('GPX-fil lastet opp!', { id: toastId });
      } catch (error: any) {
        console.error('GPX upload error:', error);
        toast.error(error.message || 'Kunne ikke lese GPX-fil', { id: toastId });
      } finally {
        if (gpxInputRef.current) gpxInputRef.current.value = '';
      }
    }
  };

  // Auto-sync on mount
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastSync = now - lastAutoSyncTime;

    if (selectedDog && timeSinceLastSync > MIN_SYNC_INTERVAL && !hasInitialSynced.current) {
      hasInitialSynced.current = true;
      handleGarminSync(true);
    }
  }, [selectedDog, lastAutoSyncTime]);

  const handleSave = async () => {
    // Check authentication first
    if (!user) {
      toast.error('Du er ikke innlogget. Vennligst logg inn på nytt.');
      navigate('/login');
      return;
    }

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
      photos: [],
      notes: quickNote || '',
      tags: [],
      is_favorite: false,
    };

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
      (acc: number, h: any) => acc + h.game_seen.reduce((a: number, g: any) => a + g.count, 0),
      0
    ),
    total_harvested: filteredHunts.reduce(
      (acc: number, h: any) => acc + h.game_harvested.reduce((a: number, g: any) => a + g.count, 0),
      0
    ),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 relative"
    >
      <AuroraBackground />
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Hei, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-emerald-400">{user?.displayName?.split(' ')[0] || 'Jeger'}</span> 👋
          </h1>
          <p className="text-zinc-400 text-lg">Logg jaktturen her</p>
        </div>

      </div>

      {/* Draft recovery banner */}
      {showDraftBanner && (
        <div className="bg-primary-900/20 border border-primary-500/30 rounded-lg p-4 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            <div className="text-sm text-zinc-200">
              <span className="font-medium">Ulagret kladd funnet.</span>
              <span className="text-zinc-400 ml-2">Vil du fortsette der du slapp?</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={restoreDraft}
              className="text-xs bg-primary-600 hover:bg-primary-500 text-white px-3 py-1.5 rounded transition-colors"
            >
              Gjenopprett
            </button>
            <button
              onClick={() => {
                clearDraft();
                setShowDraftBanner(false);
              }}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Forkast
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Log & Recent Hunts */}
        <div className="lg:col-span-2 space-y-8">

          {/* Quick Log Card */}
          <div className="card overflow-hidden border-zinc-800/60 bg-zinc-900/40">
            <div className="card-header bg-zinc-900/50 flex justify-between items-center py-3">
              <h2 className="font-semibold text-zinc-100 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Zap className="w-4 h-4 text-primary-500" /> Hurtigregistrering
              </h2>
              {showDraftBanner && (
                <span className="text-[10px] bg-primary-500/10 text-primary-400 px-2 py-0.5 rounded-full font-medium border border-primary-500/20">
                  Kladd lagret
                </span>
              )}
            </div>

            <div className="p-6 space-y-5">
              {/* Date/Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="input-label">Dato</label>
                  <DatePicker
                    selected={huntDate}
                    onChange={setHuntDate}
                  />
                </div>
                <div>
                  <label className="input-label">Starttid</label>
                  <TimePicker
                    value={startTime}
                    onChange={setStartTime}
                  />
                </div>
                <div>
                  <label className="input-label">Sluttid</label>
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                  />
                </div>
              </div>

              {/* Dog/Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">
                    Hund {!selectedDog && <span className="text-error">*</span>}
                  </label>
                  <select
                    value={selectedDog}
                    onChange={(e) => setSelectedDog(e.target.value)}
                    className={`select text-sm ${validationErrors.dog ? 'border-error ring-1 ring-error' : ''}`}
                  >
                    <option value="">Velg hund</option>
                    {activeDogs.map((dog) => (
                      <option key={dog.id} value={dog.id}>{dog.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="input-label">
                    Sted {!selectedLocation && !customLocation && <span className="text-error">*</span>}
                  </label>
                  {selectedLocation === '_custom' ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        placeholder="Skriv stedsnavn..."
                        className={`input text-sm pr-8 ${validationErrors.location ? 'border-error ring-1 ring-error' : ''}`}
                        autoFocus
                      />
                      <button
                        onClick={() => { setSelectedLocation(''); setCustomLocation(''); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
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
                      }}
                      className={`select text-sm ${validationErrors.location ? 'border-error ring-1 ring-error' : ''}`}
                    >
                      <option value="">Velg sted</option>
                      {recentLocations.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                      <option value="_custom">+ Nytt sted</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Weather Widget (Inline) */}
              {weather && (
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Thermometer className="w-4 h-4 text-primary-500" />
                    <span>{weather.temperature}°C</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Wind className="w-4 h-4 text-primary-500" />
                    <span>{weather.wind_speed} m/s {weather.wind_direction}</span>
                  </div>
                  <span className="text-zinc-500 border-l border-zinc-800 pl-4">{weather.conditions}</span>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="input-label">Notater</label>
                <textarea
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Hvordan var turen?"
                  className="input text-sm min-h-[100px] resize-none"
                />
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/50">
                <button
                  onClick={() => setShowGameModal(true)}
                  className="flex-1 btn-secondary text-xs sm:text-sm py-2 sm:py-2.5 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-14 sm:h-auto"
                  title="Registrer vilt"
                >
                  <Target className="w-4 h-4" />
                  <span className="text-[10px] sm:text-sm leading-none sm:leading-normal">Vilt</span>
                  {(Object.values(gameSeen).reduce((a, b) => a + b, 0) > 0 || Object.values(gameHarvested).reduce((a, b) => a + b, 0) > 0) && (
                    <span className="ml-1 bg-primary-500/20 text-primary-400 text-xs px-1.5 py-0.5 rounded">
                      {Object.values(gameSeen).reduce((a, b) => a + b, 0) + Object.values(gameHarvested).reduce((a, b) => a + b, 0)}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 btn-secondary text-xs sm:text-sm py-2 sm:py-2.5 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-14 sm:h-auto"
                  title="Last opp bilder"
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-[10px] sm:text-sm leading-none sm:leading-normal">Bilder</span>
                  {photos.length > 0 && (
                    <span className="ml-1 bg-primary-500/20 text-primary-400 text-xs px-1.5 py-0.5 rounded">
                      {photos.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => gpxInputRef.current?.click()}
                  className="flex-1 btn-secondary text-xs sm:text-sm py-2 sm:py-2.5 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 h-14 sm:h-auto"
                  title="Last opp GPX-spor"
                >
                  <Activity className="w-4 h-4" />
                  <span className="text-[10px] sm:text-sm leading-none sm:leading-normal">GPX</span>
                  {matchedTrack && (
                    <span className="ml-1 bg-emerald-500/20 text-emerald-400 text-xs px-1.5 py-0.5 rounded">
                      ✓
                    </span>
                  )}
                </button>
                <input
                  type="file"
                  ref={gpxInputRef}
                  onChange={handleGpxUpload}
                  accept=".gpx"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  multiple
                  accept="image/*"
                  className="hidden"
                />

                <button
                  onClick={handleSave}
                  disabled={createHuntMutation.isPending}
                  className="flex-[1.5] btn-primary text-xs sm:text-sm py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-primary-900/20"
                >
                  <Send className="w-4 h-4" />
                  {createHuntMutation.isPending ? 'Lagrer...' : 'Lagre tur'}
                </button>
              </div>

              {/* Track Confirmation */}
              {showTrackConfirm && matchedTrack && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Spor lagt til: {matchedTrack.distance_km} km</span>
                  </div>
                  <button onClick={() => { setMatchedTrack(null); setShowTrackConfirm(false); }} className="text-zinc-500 hover:text-zinc-300">✕</button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Hunts List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-medium text-zinc-200">Siste turer</h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Søk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-sm w-40 focus:w-60 transition-all focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-1.5 rounded-lg border ${showFilters ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                >
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 grid grid-cols-3 gap-2 animate-slide-down">
                <select value={filterGame} onChange={(e) => setFilterGame(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-300">
                  <option value="">Alle arter</option>
                  {gameTypes.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-300">
                  <option value="">Alle steder</option>
                  {recentLocations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={filterDog} onChange={(e) => setFilterDog(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-300">
                  <option value="">Alle hunder</option>
                  {activeDogs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-3">
              {isLoading ? (
                <>
                  <HuntCardSkeleton />
                  <HuntCardSkeleton />
                </>
              ) : filteredHunts.length === 0 ? (
                <div className="card p-12 text-center border-dashed border-zinc-800">
                  <MapPin className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                  <p className="text-zinc-500">Ingen turer funnet.</p>
                </div>
              ) : (
                filteredHunts.map((hunt: Hunt) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                    key={hunt.id}
                    onClick={() => navigate(`/hunt/${hunt.id}`)}
                    className="card hover:border-primary-500/30 hover:bg-zinc-900/80 transition-all cursor-pointer group"
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-zinc-100 group-hover:text-primary-400 transition-colors">{hunt.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(hunt.date), 'dd.MM.yyyy')}</span>
                            <span>•</span>
                            <MapPin className="w-3 h-3" />
                            <span>{hunt.location.name}</span>
                          </div>
                        </div>
                        {hunt.photos && hunt.photos.length > 0 && (
                          <div className="bg-zinc-800/50 p-1.5 rounded-md">
                            <ImageIcon className="w-4 h-4 text-zinc-400" />
                          </div>
                        )}
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-4 pt-3 border-t border-zinc-800/50">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <Dog className="w-3.5 h-3.5" />
                          <span>{hunt.dogs.length} hund{hunt.dogs.length !== 1 ? 'er' : ''}</span>
                        </div>
                        {(hunt.game_seen.length > 0 || hunt.game_harvested.length > 0) && (
                          <>
                            <div className="w-px h-3 bg-zinc-800" />
                            <div className="flex gap-3 text-xs">
                              {hunt.game_seen.length > 0 && (
                                <span className="text-primary-400 font-medium">
                                  {hunt.game_seen.reduce((a, g) => a + g.count, 0)} sett
                                </span>
                              )}
                              {hunt.game_harvested.length > 0 && (
                                <span className="text-emerald-400 font-medium">
                                  {hunt.game_harvested.reduce((a, g) => a + g.count, 0)} felt
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Info */}
        <div className="space-y-6">

          {/* Season Stats Card */}
          <TiltCard className="card bg-gradient-to-br from-zinc-900 to-zinc-900/50 border-zinc-800 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="p-5 relative">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" /> Sesong {selectedSeason}
                </h3>
                <div className="flex gap-1">
                  <button onClick={() => navigateSeason('next')} disabled={availableSeasons.indexOf(selectedSeason) === 0} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 disabled:opacity-30"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                  <button onClick={() => navigateSeason('prev')} disabled={availableSeasons.indexOf(selectedSeason) === availableSeasons.length - 1} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center mb-6">
                <div className="p-3 bg-zinc-800/30 rounded-lg backdrop-blur-sm">
                  <div className="text-2xl font-bold text-white">{seasonStats.total_hunts}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">Turer</div>
                </div>
                <div className="p-3 bg-zinc-800/30 rounded-lg backdrop-blur-sm">
                  <div className="text-2xl font-bold text-primary-400">{seasonStats.total_seen}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">Sett</div>
                </div>
                <div className="p-3 bg-zinc-800/30 rounded-lg backdrop-blur-sm">
                  <div className="text-2xl font-bold text-emerald-400">{seasonStats.total_harvested}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">Felt</div>
                </div>
              </div>

              <div className="border-t border-zinc-800/50 pt-4">
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 pl-1">Aktivitet</h4>
                <SeasonStatsChart hunts={filteredHunts} season={selectedSeason} />
              </div>

              <button onClick={() => navigate('/statistics')} className="w-full mt-4 btn-outline text-xs py-2">
                Se full statistikk
              </button>
            </div>
          </TiltCard>



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
                  <div key={game.id} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-zinc-100">{game.name}</span>
                      <button
                        onClick={() => resetGameCount(game.id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Seen */}
                      <div className="bg-zinc-950 rounded-lg p-2 flex items-center justify-between border border-zinc-800">
                        <span className="text-xs font-medium text-zinc-400">Sett</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateGameCount(setGameSeen, game.id, -1)}
                            className="w-6 h-6 rounded bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-medium text-primary-400">{seen}</span>
                          <button
                            onClick={() => updateGameCount(setGameSeen, game.id, 1)}
                            className="w-6 h-6 rounded bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Harvested */}
                      <div className="bg-zinc-950 rounded-lg p-2 flex items-center justify-between border border-zinc-800">
                        <span className="text-xs font-medium text-zinc-400">Felt</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateGameCount(setGameHarvested, game.id, -1)}
                            className="w-6 h-6 rounded bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-medium text-emerald-400">{harvested}</span>
                          <button
                            onClick={() => updateGameCount(setGameHarvested, game.id, 1)}
                            className="w-6 h-6 rounded bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
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
              <div className="text-center py-8 text-zinc-500 bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800">
                <p>Ingen vilt registrert enda</p>
                <p className="text-xs mt-1">Velg en art nedenfor for å legge til</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Legg til art</h3>
            <div className="grid grid-cols-3 gap-2">
              {gameTypes
                .filter((g) => !((gameSeen[g.id] || 0) > 0 || (gameHarvested[g.id] || 0) > 0))
                .map((game) => (
                  <button
                    key={game.id}
                    onClick={() => updateGameCount(setGameSeen, game.id, 1)}
                    className="p-3 bg-zinc-900 hover:bg-primary-500/10 hover:text-primary-400 rounded-lg text-sm font-medium transition-colors border border-zinc-800 hover:border-primary-500/20 text-left"
                  >
                    + {game.name}
                  </button>
                ))}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <button
              onClick={() => setShowGameModal(false)}
              className="w-full btn-primary py-3"
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
    </motion.div >
  );
}
