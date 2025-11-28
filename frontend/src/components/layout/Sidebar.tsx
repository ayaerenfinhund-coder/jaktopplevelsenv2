import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Dog,
  Calendar,
  BarChart3,
  Download,
  X,
  Camera,
  Plus,
} from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useAppStore } from '../../store/useAppStore';
import { apiClient } from '../../services/apiClient';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Oversikt', href: '/', icon: Home },
  { name: 'Hunder', href: '/dogs', icon: Dog },
  { name: 'Statistikk', href: '/statistics', icon: BarChart3 },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { dogs, quickFilterActive, setQuickFilter } = useAppStore();

  // Calculate actual stats from store
  const activeDogs = dogs.filter(d => d.is_active).length;

  const handleQuickFilter = (filterType: 'season' | 'photos') => {
    // Toggle filter or activate it
    if (quickFilterActive === filterType) {
      setQuickFilter('none');
      toast.success('Filter fjernet', { duration: 2000 });
    } else {
      setQuickFilter(filterType);

      if (filterType === 'season') {
        toast.success('Viser jaktturer fra denne sesongen', { duration: 2000 });
      } else if (filterType === 'photos') {
        toast.success('Viser jaktturer med bilder', { duration: 2000 });
      }
    }

    // Navigate to home if not already there
    if (window.location.pathname !== '/') {
      navigate('/');
    }

    // Scroll to hunt history section
    setTimeout(() => {
      const element = document.getElementById('hunt-history');
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    onClose();
  };

  const handleExport = async () => {
    try {
      toast.loading('Eksporterer data...', { id: 'export' });

      // Get actual data from API
      const blob = await apiClient.exportData('json');

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jaktopplevelsen-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Data eksportert!', { id: 'export' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Kunne ikke eksportere data', { id: 'export' });
    }
  };

  const handleNewHunt = () => {
    navigate('/hunt/new');
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 bottom-0 w-64 bg-zinc-900 border-r border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:top-14 lg:z-30',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800">
          <span className="text-lg font-semibold">Meny</span>
          <button
            onClick={onClose}
            className="btn-ghost btn-icon-sm"
            aria-label="Lukk meny"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col h-[calc(100%-60px)] lg:h-full overflow-y-auto">
          {/* New Hunt CTA */}
          <div className="p-3">
            <button
              onClick={handleNewHunt}
              className="w-full btn-primary btn-md flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ny jakttur
            </button>
          </div>

          {/* Main navigation */}
          <nav className="p-3">
            <h3 className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Navigasjon
            </h3>
            <ul className="space-y-0.5">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    onClick={() => {
                      // Clear quick filter when navigating away from dashboard
                      if (item.href !== '/' && quickFilterActive !== 'none') {
                        setQuickFilter('none');
                      }
                      onClose();
                    }}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                        isActive
                          ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                      )
                    }
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick filters */}
          <div className="p-3 border-t border-zinc-800">
            <h3 className="px-3 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Hurtigfiltre
            </h3>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => handleQuickFilter('season')}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group',
                    quickFilterActive === 'season'
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                  )}
                >
                  <Calendar className={clsx(
                    'w-5 h-5 flex-shrink-0',
                    quickFilterActive === 'season' ? 'text-primary-400' : 'group-hover:text-primary-400'
                  )} />
                  <span className="font-medium flex-1 text-left">
                    Denne sesongen
                  </span>
                  {quickFilterActive === 'season' && (
                    <span className="text-xs bg-primary-700 text-white px-2 py-0.5 rounded-full">Aktiv</span>
                  )}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleQuickFilter('photos')}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group',
                    quickFilterActive === 'photos'
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                  )}
                >
                  <Camera className={clsx(
                    'w-5 h-5 flex-shrink-0',
                    quickFilterActive === 'photos' ? 'text-primary-400' : 'group-hover:text-primary-400'
                  )} />
                  <span className="font-medium flex-1 text-left">
                    Med bilder
                  </span>
                  {quickFilterActive === 'photos' && (
                    <span className="text-xs bg-primary-700 text-white px-2 py-0.5 rounded-full">Aktiv</span>
                  )}
                </button>
              </li>
            </ul>
          </div>

          {/* Statistics - more compact */}
          <div className="p-3 border-t border-zinc-800">
            <h3 className="px-3 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Statistikk
            </h3>
            <div className="px-3 space-y-3">
              <div>
                <div className="text-xs text-text-muted">Aktive hunder</div>
                <div className="text-xl font-semibold text-primary-400">
                  {activeDogs}
                </div>
              </div>
              <button
                onClick={() => {
                  navigate('/statistics');
                  onClose();
                }}
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                Se full statistikk →
              </button>
            </div>
          </div>

          {/* Export button */}
          <div className="p-3 border-t border-zinc-800 mt-auto">
            <button
              onClick={handleExport}
              className="w-full btn-outline btn-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Eksporter data
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
