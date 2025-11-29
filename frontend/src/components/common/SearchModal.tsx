import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MapPin, Dog, Calendar, Target } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../../store/useAppStore';
import { useHunts } from '../../hooks/useApi';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  type: 'hunt' | 'dog' | 'location' | 'game';
  title: string;
  subtitle: string;
  icon: typeof Search;
  route: string;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { dogs, recentLocations } = useAppStore();
  const { data: hunts = [] } = useHunts();

  // Build searchable items from store data
  const searchableItems = useMemo(() => {
    const items: SearchResult[] = [];

    // Add hunts from real data
    hunts.forEach((hunt: any) => {
      const dogNames = hunt.dogs?.map((dogId: string) => {
        const dog = dogs.find(d => d.id === dogId);
        return dog?.name || dogId;
      }).join(', ') || 'Ingen hund';

      items.push({
        id: `hunt-${hunt.id}`,
        type: 'hunt',
        title: hunt.title || `Jakttur ${format(new Date(hunt.date), 'd. MMM yyyy')}`,
        subtitle: `${format(new Date(hunt.date), 'd. MMMM yyyy', { locale: nb })} • ${hunt.location?.name || 'Ukjent'} • ${dogNames}`,
        icon: Calendar,
        route: `/hunt/${hunt.id}`,
      });

      // Also add searchable notes
      if (hunt.notes) {
        items.push({
          id: `hunt-notes-${hunt.id}`,
          type: 'hunt',
          title: hunt.title || `Jakttur ${format(new Date(hunt.date), 'd. MMM yyyy')}`,
          subtitle: `Notater: "${hunt.notes.substring(0, 50)}${hunt.notes.length > 50 ? '...' : ''}"`,
          icon: Calendar,
          route: `/hunt/${hunt.id}`,
        });
      }
    });

    // Add dogs
    dogs.forEach((dog) => {
      items.push({
        id: `dog-${dog.id}`,
        type: 'dog',
        title: dog.name,
        subtitle: `${dog.breed} • ${dog.is_active ? 'Aktiv' : 'Inaktiv'}`,
        icon: Dog,
        route: '/dogs',
      });
    });

    // Add locations with stats from real hunts
    const locationStats: Record<string, { count: number }> = {};
    hunts.forEach((hunt: any) => {
      const locationName = hunt.location?.name;
      if (locationName) {
        if (!locationStats[locationName]) {
          locationStats[locationName] = { count: 0 };
        }
        locationStats[locationName].count++;
      }
    });

    recentLocations.forEach((loc) => {
      const stats = locationStats[loc] || { count: 0 };
      items.push({
        id: `location-${loc}`,
        type: 'location',
        title: loc,
        subtitle: `${stats.count} jaktturer`,
        icon: MapPin,
        route: '/',
      });
    });

    // Add game types as searchable items
    const gameTypes = [
      { id: 'roe_deer', name: 'Rådyr' },
      { id: 'hare', name: 'Hare' },
      { id: 'moose', name: 'Elg' },
      { id: 'deer', name: 'Hjort' },
      { id: 'grouse', name: 'Rype' },
      { id: 'fox', name: 'Rev' },
    ];

    gameTypes.forEach((game) => {
      items.push({
        id: `game-${game.id}`,
        type: 'game',
        title: game.name,
        subtitle: `Søk etter jaktturer med ${game.name.toLowerCase()}`,
        icon: Target,
        route: '/',
      });
    });

    return items;
  }, [dogs, recentLocations, hunts]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!isOpen) {
          // This would need to be lifted up to parent
        } else {
          onClose();
        }
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.length > 1) {
      // Search through all items
      const searchTerms = value.toLowerCase().split(' ').filter((t) => t.length > 0);

      const filtered = searchableItems.filter((item) => {
        const searchText = `${item.title} ${item.subtitle}`.toLowerCase();
        return searchTerms.every((term) => searchText.includes(term));
      });

      // Remove duplicates (same route)
      const uniqueResults = filtered.reduce((acc, item) => {
        const existingIndex = acc.findIndex((r) => r.route === item.route && r.type === item.type);
        if (existingIndex === -1) {
          acc.push(item);
        }
        return acc;
      }, [] as SearchResult[]);

      // Sort by relevance (exact title match first, then type priority)
      uniqueResults.sort((a, b) => {
        const aExact = a.title.toLowerCase().includes(value.toLowerCase()) ? 0 : 1;
        const bExact = b.title.toLowerCase().includes(value.toLowerCase()) ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;

        const typePriority = { hunt: 0, dog: 1, location: 2, game: 3 };
        return typePriority[a.type] - typePriority[b.type];
      });

      setResults(uniqueResults.slice(0, 10));
      setSelectedIndex(0);
    } else {
      setResults([]);
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.route);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-background-light rounded-xl border border-background-lighter shadow-2xl overflow-hidden animate-slide-down">
          {/* Search input */}
          <div className="flex items-center gap-4 p-4 border-b border-background-lighter">
            <Search className="w-5 h-5 text-text-muted flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Søk etter jaktturer, hunder, steder..."
              className="flex-1 bg-transparent text-text-primary placeholder-text-muted focus:outline-none text-lg"
            />
            <button
              onClick={onClose}
              className="btn-ghost btn-icon-sm"
              aria-label="Lukk søk"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {query.length === 0 ? (
              <div className="p-8 text-center text-text-muted">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Begynn å skrive for å søke...</p>
                <p className="text-sm mt-2">
                  Søk etter jaktturer, hunder eller steder
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-text-muted">
                <p>Ingen resultater funnet for "{query}"</p>
              </div>
            ) : (
              <ul className="p-2">
                {results.map((result, index) => (
                  <li key={result.id}>
                    <button
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={clsx(
                        'w-full flex items-center gap-4 p-3 rounded-lg transition-colors text-left',
                        index === selectedIndex
                          ? 'bg-primary-700/20 text-primary-300'
                          : 'hover:bg-background-lighter'
                      )}
                    >
                      <div className="w-10 h-10 bg-background-lighter rounded-lg flex items-center justify-center flex-shrink-0">
                        <result.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-primary truncate">
                          {result.title}
                        </div>
                        <div className="text-sm text-text-muted truncate">
                          {result.subtitle}
                        </div>
                      </div>
                      <span className="badge-secondary text-xs">
                        {result.type === 'hunt' ? 'jakttur' : result.type === 'dog' ? 'hund' : result.type === 'location' ? 'sted' : 'vilt'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-background-lighter bg-background text-xs text-text-muted flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background-lighter rounded">↑↓</kbd>
              naviger
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background-lighter rounded">↵</kbd>
              velg
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background-lighter rounded">esc</kbd>
              lukk
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
