import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css'; // Premium styles

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false, // CRITICAL: Prevent double mutations!
    },
  },
});

// Hide splash screen when React mounts
setTimeout(() => {
  if (typeof window !== 'undefined' && (window as any).hideLoader) {
    (window as any).hideLoader();
  }
}, 100);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#18181b', // Zinc 900
            color: '#fafafa',      // Zinc 50
            border: '1px solid #27272a', // Zinc 800
          },
          success: {
            iconTheme: {
              primary: '#10b981', // Emerald 500
              secondary: '#fafafa',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444', // Red 500
              secondary: '#fafafa',
            },
          },
        }}
      />
    </BrowserRouter>
  </QueryClientProvider>
);
