import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Dog,
  Camera,
  Share2,
  Edit3,
  Trash2,
  Wind,
  Thermometer,
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
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import HuntMap from '../components/maps/HuntMap';
import PhotoGallery from '../components/gallery/PhotoGallery';
import toast from 'react-hot-toast';
import { useHunt, useUpdateHunt, useDeleteHunt } from '../hooks/useApi';
import { apiClient } from '../services/apiClient';

export default function HuntDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // REAL DATA
  const { data: hunt, isLoading, error } = useHunt(id || '');
  const updateHuntMutation = useUpdateHunt();
  const deleteHuntMutation = useDeleteHunt();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Initialize edit state when hunt loads
  useEffect(() => {
    if (hunt) {
      setNotesText(hunt.notes || '');
      setEditTitle(hunt.title);
      setEditDate(hunt.date);
      setEditStartTime(hunt.start_time);
      setEditEndTime(hunt.end_time);
      setEditLocation(hunt.location?.name || '');
    }
  }, [hunt]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteHuntMutation.mutateAsync(id);
      toast.success('Jakttur slettet');
      navigate('/');
    } catch (error: any) {
      toast.error('Kunne ikke slette jakttur');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !hunt) return;

    try {
      await updateHuntMutation.mutateAsync({
        id,
        data: {
          title: editTitle,
          date: editDate,
          start_time: editStartTime,
          end_time: editEndTime,
          location: {
            ...hunt.location,
            name: editLocation,
          },
        },
      });
      setShowEditModal(false);
      toast.success('Jakttur oppdatert!');
    } catch (error: any) {
      toast.error('Kunne ikke oppdatere jakttur');
    }
  };

  const handleNoteSave = async () => {
    if (!id) return;
    try {
      await updateHuntMutation.mutateAsync({
        id,
        data: { notes: notesText },
      });
      setEditingNotes(false);
      toast.success('Notater lagret');
    } catch (error) {
      toast.error('Kunne ikke lagre notater');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && id) {
      const toastId = toast.loading('Laster opp bilder...');
      try {
        const uploadPromises = Array.from(files).map(file =>
          apiClient.uploadPhoto(file, id)
        );
        const uploadedPhotos = await Promise.all(uploadPromises);

        // Update hunt with new photos
        const currentPhotos = hunt.photos || [];
        await updateHuntMutation.mutateAsync({
          id,
          data: { photos: [...currentPhotos, ...uploadedPhotos] }
        });

        toast.success(`${files.length} bilde(r) lagt til`, { id: toastId });
      } catch (error) {
        console.error("Photo upload error:", error);
        toast.error('Kunne ikke laste opp bilder', { id: toastId });
      }
    }
  };

  const handlePhotoDelete = async (photoId: string) => {
    if (!id) return;
    const toastId = toast.loading('Sletter bilde...');
    try {
      // Filter out the photo - handle both object and string formats
      const updatedPhotos = (hunt.photos || []).filter((p: any) => {
        if (typeof p === 'string') {
          return p !== photoId; // String URL comparison
        }
        return p.id !== photoId; // Object ID comparison
      });

      await updateHuntMutation.mutateAsync({
        id,
        data: { photos: updatedPhotos }
      });
      toast.success('Bilde slettet', { id: toastId });
    } catch (error) {
      console.error("Photo delete error:", error);
      toast.error('Kunne ikke slette bilde', { id: toastId });
    }
  };

  const gameTypeLabels: Record<string, string> = {
    moose: 'Elg',
    deer: 'Hjort',
    roe_deer: 'Rådyr',
    hare: 'Hare',
    grouse: 'Rype',
    fox: 'Rev',
    // Fallbacks for legacy/English data
    'Roe Deer': 'Rådyr',
    'Moose': 'Elg',
    'Red Deer': 'Hjort',
    'Deer': 'Hjort',
    'Grouse': 'Rype',
    'Fox': 'Rev',
    'Hare': 'Hare',
  };

  const weatherLabels: Record<string, string> = {
    clear: 'Klarvær',
    cloudy: 'Lettskyet',
    overcast: 'Overskyet',
    rain: 'Regn',
    snow: 'Snø',
    fog: 'Tåke',
    light_rain: 'Lett regn',
    heavy_rain: 'Kraftig regn',
    light_snow: 'Lett snø',
    heavy_snow: 'Kraftig snøfall',
    sleet: 'Sludd',
    partly_cloudy: 'Delvis skyet',
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'clear':
        return <Sun className="w-6 h-6 text-yellow-400" />;
      case 'rain':
      case 'light_rain':
      case 'heavy_rain':
        return <CloudRain className="w-6 h-6 text-blue-400" />;
      case 'snow':
      case 'light_snow':
      case 'heavy_snow':
        return <CloudSnow className="w-6 h-6 text-blue-200" />;
      case 'fog':
        return <CloudFog className="w-6 h-6 text-gray-400" />;
      default:
        return <Cloud className="w-6 h-6 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !hunt) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          Fant ikke jaktturen
        </h2>
        <p className="text-text-muted mb-6">
          {(error as any)?.message || 'Turen eksisterer ikke eller du har ikke tilgang.'}
        </p>
        <Link to="/">
          <Button variant="primary">Tilbake til oversikt</Button>
        </Link>
      </div>
    );
  }

  // Calculate totals
  const totalGameSeen = (hunt.game_seen || []).reduce((sum: number, obs: any) => sum + (obs.count || 0), 0);
  const totalHarvested = (hunt.game_harvested || []).reduce((sum: number, g: any) => sum + (g.count || 0), 0);

  // Tracks handling - assuming tracks might be objects or IDs
  // Ideally we should fetch tracks if they are IDs, but for now we handle what we have
  const tracks = Array.isArray(hunt.tracks) ? hunt.tracks : [];
  // Filter out ID-only tracks if we can't display them (temporary fix)
  const displayTracks = tracks.filter((t: any) => typeof t === 'object' && t.geojson);

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-8">
      {/* Header - mobilvennlig */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-3 -ml-3 hover:bg-background-lighter rounded-lg transition-colors"
            aria-label="Tilbake"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-text-primary flex-1">{hunt.title}</h1>
        </div>

        {/* Metadata - vertikal layout for mobil */}
        <div className="flex flex-col gap-2 text-base text-text-muted pl-1">
          <span className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {hunt.date ? format(new Date(hunt.date), 'd. MMMM yyyy', { locale: nb }) : 'Ingen dato'}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {hunt.start_time} - {hunt.end_time}
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {hunt.location?.name}, {hunt.location?.region}
          </span>
        </div>

        {/* Handlingsknapper - større touch targets */}
        <div className="flex items-center gap-3 pt-2">
          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-background-light hover:bg-background-lighter rounded-lg transition-colors"
            onClick={() => {
              const shareUrl = `${window.location.origin}/share/${hunt.id}`;
              navigator.clipboard.writeText(shareUrl);
              toast.success('Delingslenke kopiert!');
            }}
          >
            <Share2 className="w-5 h-5" />
            <span className="text-sm font-medium">Del</span>
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-background-light hover:bg-background-lighter rounded-lg transition-colors"
            onClick={() => setShowEditModal(true)}
          >
            <Edit3 className="w-5 h-5" />
            <span className="text-sm font-medium">Rediger</span>
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors ml-auto"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="w-5 h-5" />
            <span className="text-sm font-medium">Slett</span>
          </button>
        </div>
      </div>

      {/* 1. Kart - FØRST */}
      {displayTracks.length > 0 && (
        <div className="bg-background-light rounded-xl overflow-hidden">
          <HuntMap
            tracks={displayTracks}
            center={hunt.location?.coordinates}
            initialHeight="medium"
          />
        </div>
      )}

      {/* 2. Notater */}
      <div className="bg-background-light rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">Notater</h3>
          {!editingNotes ? (
            <button
              onClick={() => setEditingNotes(true)}
              className="px-3 py-1.5 text-sm text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"
            >
              Rediger
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingNotes(false);
                  setNotesText(hunt.notes || '');
                }}
                className="px-3 py-1.5 text-sm text-text-muted hover:bg-background-lighter rounded-lg transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleNoteSave}
                className="px-3 py-1.5 text-sm text-primary-400 hover:bg-primary-400/10 rounded-lg font-medium transition-colors"
              >
                Lagre
              </button>
            </div>
          )}
        </div>
        {editingNotes ? (
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            className="input min-h-[140px] w-full text-base"
            placeholder="Skriv dine notater her..."
            autoFocus
          />
        ) : (
          <p className="text-text-secondary text-base leading-relaxed whitespace-pre-wrap">
            {hunt.notes || <span className="text-text-muted italic">Ingen notater</span>}
          </p>
        )}
      </div>

      {/* 3. Statistikk - observert/Skutt/distanse/varighet */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-background-light rounded-xl p-4 text-center">
          <Eye className="w-6 h-6 text-primary-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-text-primary">{totalGameSeen}</p>
          <p className="text-sm text-text-muted">Observert</p>
        </div>
        <div className="bg-background-light rounded-xl p-4 text-center">
          <Target className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-2xl font-bold text-text-primary">{totalHarvested}</p>
          <p className="text-sm text-text-muted">Skutt</p>
        </div>
        {displayTracks[0] && displayTracks[0].statistics && (
          <>
            <div className="bg-background-light rounded-xl p-4 text-center">
              <Dog className="w-6 h-6 text-accent-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">{displayTracks[0].statistics.distance_km} km</p>
              <p className="text-sm text-text-muted">Distanse</p>
            </div>
            <div className="bg-background-light rounded-xl p-4 text-center">
              <Clock className="w-6 h-6 text-text-muted mx-auto mb-2" />
              <p className="text-2xl font-bold text-text-primary">
                {Math.floor(displayTracks[0].statistics.duration_minutes / 60)}t {displayTracks[0].statistics.duration_minutes % 60}m
              </p>
              <p className="text-sm text-text-muted">Varighet</p>
            </div>
          </>
        )}
      </div>

      {/* 4. Værforhold */}
      {hunt.weather && (
        <div className="bg-background-light rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            {getWeatherIcon(hunt.weather.conditions)}
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                {weatherLabels[hunt.weather.conditions] || hunt.weather.conditions}
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

      {/* 5. Hunder */}
      {displayTracks.length > 0 && (
        <div className="bg-background-light rounded-xl p-4">
          <h3 className="text-sm font-medium text-text-muted mb-3">Hunder</h3>
          <div className="space-y-3">
            {displayTracks.map((track: any) => {
              const dogName = track.name ? track.name.split(' - ')[0] : 'Ukjent hund';
              return (
                <div key={track.id} className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: track.color || '#ccc' }}
                  >
                    {dogName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-base font-medium text-text-primary">{dogName}</p>
                    {track.statistics && (
                      <p className="text-sm text-text-muted">
                        {track.statistics.distance_km} km • {Math.floor(track.statistics.duration_minutes / 60)}t {track.statistics.duration_minutes % 60}m
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Vilt - detaljert */}
      {((hunt.game_seen && hunt.game_seen.length > 0) || (hunt.game_harvested && hunt.game_harvested.length > 0)) && (
        <div className="bg-background-light rounded-xl p-4">
          <h3 className="text-sm font-medium text-text-muted mb-3">Vilt</h3>
          <div className="grid grid-cols-2 gap-6">
            {hunt.game_seen && hunt.game_seen.length > 0 && (
              <div>
                <p className="text-xs text-text-muted mb-2">Observert</p>
                <div className="space-y-2">
                  {hunt.game_seen.map((obs: any, i: number) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-base text-text-secondary">
                        {gameTypeLabels[obs.type] || obs.type}
                      </span>
                      <span className="text-base font-medium text-text-primary">{obs.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {hunt.game_harvested && hunt.game_harvested.length > 0 && (
              <div>
                <p className="text-xs text-text-muted mb-2">Skutt</p>
                <div className="space-y-2">
                  {hunt.game_harvested.map((game: any, i: number) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-base text-text-secondary">
                        {gameTypeLabels[game.type] || game.type}
                      </span>
                      <span className="text-base font-medium text-success">{game.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Bilder */}
      <div className="bg-background-light rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">
            Bilder {hunt.photos && hunt.photos.length > 0 && `(${hunt.photos.length})`}
          </h3>
          <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors cursor-pointer">
            <Camera className="w-4 h-4" />
            Legg til
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
        </div>
        {hunt.photos && hunt.photos.length > 0 ? (
          <PhotoGallery photos={hunt.photos} onDeletePhoto={handlePhotoDelete} />
        ) : (
          <p className="text-text-muted text-base">Ingen bilder lagt til</p>
        )}
      </div>

      {/* Tagger */}
      {hunt.tags && hunt.tags.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {hunt.tags.map((tag: string) => (
            <span key={tag} className="text-sm bg-background-lighter px-3 py-1.5 rounded-lg text-text-muted">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Slett-modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Slett jakttur"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Er du sikker på at du vil slette denne jaktturen? Dette kan ikke angres.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Avbryt
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
            >
              Slett
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rediger-modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Rediger jakttur"
        size="lg"
      >
        <form
          onSubmit={handleUpdate}
          className="space-y-4"
        >
          <div>
            <label className="input-label">Tittel</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Dato</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="input-label">Sted</label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Starttid</label>
              <input
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="input-label">Sluttid</label>
              <input
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowEditModal(false)}
            >
              Avbryt
            </Button>
            <Button type="submit" variant="primary">
              Lagre endringer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
