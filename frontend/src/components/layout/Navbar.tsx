import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  User,
  Search,
  LogOut,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
import SearchModal from '../common/SearchModal';
import { authService } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await authService.signOut();
      toast.success('Du er nå logget ut');
      navigate('/login');
    } catch (error) {
      toast.error('Kunne ikke logge ut');
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-14 bg-zinc-900 border-b border-zinc-800 z-40">
        <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
          {/* Left section */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden btn-ghost btn-icon"
              aria-label="Åpne meny"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link to="/" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Jaktopplevelsen"
                className="w-12 h-12 rounded-lg object-contain"
                onError={(e) => {
                  // Fallback til SVG hvis logo.png ikke finnes
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-10 h-10 bg-primary-700 rounded-lg items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="hidden sm:block text-xl font-bold text-text-primary">
                Jaktopplevelsen
              </span>
            </Link>
          </div>

          {/* Center - Search */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-text-muted hover:border-zinc-600 hover:bg-zinc-800/80 transition-colors duration-100 group"
            >
              <Search className="w-5 h-5 group-hover:text-zinc-300 transition-colors" />
              <span className="group-hover:text-zinc-300 transition-colors">Søk etter jaktturer, hunder, steder...</span>
            </button>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Mobile only: Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex md:hidden btn-ghost btn-icon"
              aria-label="Søk"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`btn-ghost btn-icon ${user?.photoURL ? 'p-0 rounded-full overflow-hidden w-10 h-10' : ''}`}
                aria-label="Brukermeny"
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <>
                  {/* Invisible overlay to catch clicks outside */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />

                  <div className="absolute right-0 mt-2 w-64 dropdown-menu z-50 animate-slide-down">
                    {user && (
                      <div className="dropdown-header">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt="Profil"
                              className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                              <User className="w-5 h-5 text-zinc-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {user.displayName || 'Bruker'}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="py-1">
                      <Link
                        to="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="dropdown-item"
                      >
                        <Settings className="w-4 h-4 text-zinc-400" />
                        Innstillinger
                      </Link>
                      <div className="dropdown-separator" />
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="w-full dropdown-item-danger"
                      >
                        <LogOut className="w-4 h-4" />
                        Logg ut
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
