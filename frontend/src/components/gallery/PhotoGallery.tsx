import { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  MapPin,
  Calendar,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { Photo } from '../../types';

interface PhotoGalleryProps {
  photos: Photo[];
  onDeletePhoto?: (photoId: string) => void;
}

export default function PhotoGallery({
  photos,
  onDeletePhoto,
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'Escape') setSelectedIndex(null);
  };

  const handleDelete = (photoId: string) => {
    if (onDeletePhoto && confirm('Er du sikker på at du vil slette dette bildet?')) {
      onDeletePhoto(photoId);
      setSelectedIndex(null);
    }
  };

  // Touch handlers for swipe gestures
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    }
    if (isRightSwipe) {
      handlePrev();
    }
  };

  return (
    <div>
      {/* Bildegalleri */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo, index) => {
          // Handle both photo objects and plain URL strings
          const photoUrl = typeof photo === 'string' ? photo : (photo.thumbnail_url || photo.url);
          const photoId = typeof photo === 'string' ? photo : photo.id;
          const photoCaption = typeof photo === 'string' ? '' : photo.caption;

          return (
            <div key={photoId || index} className="relative group">
              <button
                onClick={() => setSelectedIndex(index)}
                className="aspect-photo-thumb bg-background-lighter rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all w-full"
              >
                <img
                  src={photoUrl}
                  alt={photoCaption || `Bilde ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%2327272a" width="200" height="200"/%3E%3Ctext fill="%2371717a" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EBilde ikke tilgjengelig%3C/text%3E%3C/svg%3E';
                  }}
                />
                {photoCaption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">{photoCaption}</p>
                  </div>
                )}
              </button>
              {onDeletePhoto && photoId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photoId);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Slett bilde"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Fullskjermvisning - Mobil-optimalisert */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black z-50 flex flex-col"
          onKeyDown={handleKeyDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
        >
          {/* Bilde - tar opp hele skjermen */}
          <div className="flex-1 flex items-center justify-center relative">
            <img
              src={typeof photos[selectedIndex] === 'string' ? photos[selectedIndex] : photos[selectedIndex].url}
              alt={typeof photos[selectedIndex] === 'string' ? `Bilde ${selectedIndex + 1}` : (photos[selectedIndex].caption || `Bilde ${selectedIndex + 1}`)}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%2327272a" width="400" height="400"/%3E%3Ctext fill="%2371717a" font-family="sans-serif" font-size="16" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EBilde ikke tilgjengelig%3C/text%3E%3C/svg%3E';
              }}
            />

            {/* Desktop: Forrige/Neste knapper på sidene */}
            {selectedIndex > 0 && (
              <button
                onClick={handlePrev}
                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
                aria-label="Forrige bilde"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            {selectedIndex < photos.length - 1 && (
              <button
                onClick={handleNext}
                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
                aria-label="Neste bilde"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </div>

          {/* Bottom bar - ALLTID SYNLIG på mobil */}
          <div className="bg-black/95 border-t border-white/10 safe-area-bottom">
            {/* Bildeinformasjon */}
            {(typeof photos[selectedIndex] !== 'string' && (photos[selectedIndex].caption || photos[selectedIndex].taken_at || photos[selectedIndex].location)) && (
              <div className="px-4 pt-3 pb-2 border-b border-white/10">
                {typeof photos[selectedIndex] !== 'string' && photos[selectedIndex].caption && (
                  <p className="text-white text-sm mb-2">
                    {photos[selectedIndex].caption}
                  </p>
                )}

                <div className="flex items-center gap-4 text-white/60 text-xs flex-wrap">
                  {typeof photos[selectedIndex] !== 'string' && photos[selectedIndex].taken_at && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {format(
                          new Date(photos[selectedIndex].taken_at),
                          'd. MMM yyyy',
                          { locale: nb }
                        )}
                      </span>
                    </div>
                  )}

                  {typeof photos[selectedIndex] !== 'string' && photos[selectedIndex].location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>
                        {photos[selectedIndex].location[0].toFixed(4)},{' '}
                        {photos[selectedIndex].location[1].toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Kontrollknapper - STORE og LETT TILGJENGELIGE */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                {/* Venstre: Navigasjon */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    disabled={selectedIndex === 0}
                    className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                    aria-label="Forrige bilde"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={selectedIndex === photos.length - 1}
                    className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                    aria-label="Neste bilde"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>

                  <span className="text-white/60 text-sm ml-2">
                    {selectedIndex + 1} / {photos.length}
                  </span>
                </div>

                {/* Høyre: Handlinger */}
                <div className="flex items-center gap-2">
                  {onDeletePhoto && (
                    <button
                      onClick={() => handleDelete(photos[selectedIndex].id)}
                      className="p-3 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all touch-manipulation"
                      aria-label="Slett bilde"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedIndex(null)}
                    className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all touch-manipulation"
                    aria-label="Lukk"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
