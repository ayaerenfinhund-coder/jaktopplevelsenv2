import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { useDogs } from './hooks/useApi';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const HuntDetail = lazy(() => import('./pages/HuntDetail'));
const NewHunt = lazy(() => import('./pages/NewHunt'));
const Dogs = lazy(() => import('./pages/Dogs'));
const Settings = lazy(() => import('./pages/Settings'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PublicHuntView = lazy(() => import('./pages/PublicHuntView'));

function App() {
  const { user, loading } = useAuth();

  // Load dogs from API when user is authenticated
  useDogs();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-text-primary">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-lg font-medium">Laster applikasjonen...</p>
        <p className="text-sm text-zinc-500 mt-2">Vent litt mens vi henter dataene dine</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-screen">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-zinc-400">Laster side...</p>
          </div>
        }
      >
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <Login />}
          />
          <Route path="/share/:shareId" element={<PublicHuntView />} />

          {/* Protected Routes - Require Authentication */}
          {!user ? (
            <Route path="*" element={<Navigate to="/login" replace />} />
          ) : (
            <Route
              path="/"
              element={<Layout />}
            >
              <Route index element={<Dashboard />} />
              <Route path="hunt/new" element={<NewHunt />} />
              <Route path="hunt/:id" element={<HuntDetail />} />
              <Route path="dogs" element={<Dogs />} />
              <Route path="statistics" element={<Statistics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          )}
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
