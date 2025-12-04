import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

// WHITELIST - Only these emails can access the app
const ALLOWED_EMAILS = [
  'sandbergsimen90@gmail.com',
  'w.geicke@gmail.com'
];

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [showUnauthorizedAlert, setShowUnauthorizedAlert] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const user = await authService.signInWithGoogle();

      // Check if user email is in whitelist
      if (!user.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
        // UNAUTHORIZED ACCESS - TRIGGER ALARM
        setShowUnauthorizedAlert(true);

        // Sign out the unauthorized user
        await authService.signOut();

        // Keep the alert visible for 5 seconds
        setTimeout(() => {
          setShowUnauthorizedAlert(false);
        }, 5000);

        return;
      }

      // Authorized user - proceed
      toast.success('Velkommen!');
      navigate('/');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Innlogging avbrutt');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Popup ble blokkert. Tillat popups for denne siden.');
      } else {
        toast.error(error.message || 'En feil oppstod ved innlogging');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-primary-500/30">

      <div className="w-full max-w-[400px] bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative z-20">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 border border-zinc-700">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-14 h-14 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <svg
              viewBox="0 0 24 24"
              className="hidden w-12 h-12 text-primary-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Jaktopplevelsen</h1>
        </div>

        {/* Login Button */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-200 text-black font-semibold py-3.5 px-4 rounded-lg transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-white/5 group relative overflow-hidden"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span className="relative z-10">{isLoading ? 'Logger inn...' : 'Logg inn med Google'}</span>
          </button>
        </div>
      </div>

      {/* UNAUTHORIZED ACCESS ALERT - FULL SCREEN ALARM */}
      {showUnauthorizedAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-pulse">
          {/* Flashing Red Background */}
          <div
            className="absolute inset-0 bg-red-600"
            style={{
              animation: 'flash 0.5s infinite'
            }}
          />

          {/* Alert Content */}
          <div className="relative z-10 bg-black border-8 border-red-600 rounded-3xl p-12 max-w-2xl mx-4 text-center shadow-2xl shadow-red-600/50 animate-bounce">
            <div className="text-9xl mb-6">🚨</div>
            <h1 className="text-6xl font-black text-red-600 mb-6 uppercase tracking-wider drop-shadow-lg">
              DU SKAL IKKE INN HER
            </h1>
            <p className="text-3xl text-white font-bold mb-4">
              UAUTORISERT TILGANG
            </p>
            <p className="text-xl text-red-400">
              Denne applikasjonen er kun for autoriserte brukere
            </p>
          </div>
        </div>
      )}

      {/* Add CSS animation for flashing */}
      <style>{`
        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
