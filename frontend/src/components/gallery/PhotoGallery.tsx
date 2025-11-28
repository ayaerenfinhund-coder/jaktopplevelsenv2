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

      {/* Fullskjermvisning */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
        >
          {/* Lukk-knapp */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
            aria-label="Lukk"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Slett-knapp */}
          {onDeletePhoto && (
            <button
              onClick={() => handleDelete(photos[selectedIndex].id)}
              className="absolute top-4 right-16 p-2 text-red-400 hover:text-red-300 transition-colors z-10"
              aria-label="Slett bilde"
            >
              <Trash2 className="w-8 h-8" />
            </button>
          )}

          {/* Forrige-knapp */}
          {selectedIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
              aria-label="Forrige bilde"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Neste-knapp */}
          {selectedIndex < photos.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
              aria-label="Neste bilde"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Bilde */}
          <div className="max-w-[90vw] max-h-[85vh] relative">
            <img
              src={typeof photos[selectedIndex] === 'string' ? photos[selectedIndex] : photos[selectedIndex].url}
              alt={typeof photos[selectedIndex] === 'string' ? `Bilde ${selectedIndex + 1}` : (photos[selectedIndex].caption || `Bilde ${selectedIndex + 1}`)}
              className="max-w-full max-h-[85vh] object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%2327272a" width="400" height="400"/%3E%3Ctext fill="%2371717a" font-family="sans-serif" font-size="16" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EBilde ikke tilgjengelig%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>

          {/* Bildeinformasjon */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <div className="max-w-4xl mx-auto">
              {typeof photos[selectedIndex] !== 'string' && photos[selectedIndex].caption && (
                <p className="text-white text-lg mb-3">
                  {photos[selectedIndex].caption}
                </p>
              )}

              <div className="flex items-center gap-6 text-white/70 text-sm">
                {typeof photos[selectedIndex] !== 'string' && photos[selectedIndex].taken_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(
                        new Date(photos[selectedIndex].taken_at),
                        'd. MMMM yyyy, HH:mm',
                        { locale: nb }
                      )}
                    </span>
                  </div>
                )}

                {typeof photos[selectedIndex] !== 'string' && photos[selectedIndex].location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {photos[selectedIndex].location[0].toFixed(4)},{' '}
                      {photos[selectedIndex].location[1].toFixed(4)}
                    </span>
                  </div>
                )}

                <button className="flex items-center gap-2 hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Last ned</span>
                </button>

                <span className="ml-auto">
                  {selectedIndex + 1} / {photos.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
