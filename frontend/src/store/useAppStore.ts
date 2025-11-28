import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DogBasic {
  id: string;
  name: string;
  breed: string;
  color: string;
  is_active: boolean;
}

interface AppState {
  // Dogs
  dogs: DogBasic[];
  addDog: (dog: DogBasic) => void;
  updateDog: (id: string, updates: Partial<DogBasic>) => void;
  removeDog: (id: string) => void;

  // Locations
  recentLocations: string[];
  addLocation: (location: string) => void;

  // Last selected values
  lastSelectedDog: string;
  setLastSelectedDog: (dogId: string) => void;
  lastSelectedLocation: string;
  setLastSelectedLocation: (location: string) => void;

  // Auto-sync tracking
  lastAutoSyncTime: number;
  setLastAutoSyncTime: (time: number) => void;

  // Quick filters
  quickFilterActive: 'none' | 'season' | 'photos';
  setQuickFilter: (filter: 'none' | 'season' | 'photos') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial dogs - will be loaded from API
      dogs: [],

      addDog: (dog) =>
        set((state) => {
          if (state.dogs.some((d) => d.id === dog.id)) {
            return state;
          }
          return { dogs: [...state.dogs, dog] };
        }),

      updateDog: (id, updates) =>
        set((state) => ({
          dogs: state.dogs.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),

      removeDog: (id) =>
        set((state) => ({
          dogs: state.dogs.filter((d) => d.id !== id),
        })),

      // Initial locations - will be populated as users add them
      recentLocations: [],

      addLocation: (location) =>
        set((state) => {
          if (!state.recentLocations.includes(location)) {
            // Add to beginning, keep max 10 locations
            const updated = [location, ...state.recentLocations].slice(0, 10);
            return { recentLocations: updated };
          }
          return state;
        }),

      // Last selected values
      lastSelectedDog: '',
      setLastSelectedDog: (dogId) => set({ lastSelectedDog: dogId }),

      lastSelectedLocation: '',
      setLastSelectedLocation: (location) => set({ lastSelectedLocation: location }),

      // Auto-sync tracking
      lastAutoSyncTime: 0,
      setLastAutoSyncTime: (time) => set({ lastAutoSyncTime: time }),

      // Quick filters
      quickFilterActive: 'none',
      setQuickFilter: (filter) => set({ quickFilterActive: filter }),
    }),
    {
      name: 'jaktopplevelsen-storage',
    }
  )
);
