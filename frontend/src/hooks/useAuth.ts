import { useState, useEffect } from 'react';
import { authService, AppUser } from '../services/authService';

// WHITELIST - Only these emails can access the app
const ALLOWED_EMAILS = [
  'sandbergsimen90@gmail.com',
  'w.geicke@gmail.com'
];

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (authUser) => {
      // Check if user is authorized
      if (authUser && authUser.email && !ALLOWED_EMAILS.includes(authUser.email.toLowerCase())) {
        // Unauthorized user - sign them out immediately
        console.warn('Unauthorized access attempt:', authUser.email);
        await authService.signOut();
        setUser(null);
      } else {
        setUser(authUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    signInWithGoogle: authService.signInWithGoogle,
    signOut: authService.signOut,
  };
}
