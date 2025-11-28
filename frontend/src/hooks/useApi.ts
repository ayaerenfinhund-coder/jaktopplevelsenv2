/**
 * Custom React hooks for data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { useAppStore } from '../store/useAppStore';
import { useEffect } from 'react';

/**
 * Hook to fetch and sync dogs from API to Zustand store
 */
export function useDogs() {
    const { dogs, addDog, updateDog } = useAppStore();

    const { data: apiDogs, isLoading, error } = useQuery({
        queryKey: ['dogs'],
        queryFn: () => apiClient.getDogs(),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    // Sync API dogs to Zustand store
    useEffect(() => {
        if (apiDogs && apiDogs.length > 0) {
            // Clear existing and add all from API
            apiDogs.forEach((dog: any) => {
                const existing = dogs.find(d => d.id === dog.id);
                if (!existing) {
                    addDog(dog);
                } else {
                    updateDog(dog.id, dog);
                }
            });
        }
    }, [apiDogs]);

    return {
        dogs,
        isLoading,
        error,
    };
}

/**
 * Hook to create a new dog
 */
export function useCreateDog() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => apiClient.createDog(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dogs'] });
        },
    });
}

/**
 * Hook to update a dog
 */
export function useUpdateDog() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            apiClient.updateDog(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dogs'] });
        },
    });
}

/**
 * Hook to delete a dog
 */
export function useDeleteDog() {
    const queryClient = useQueryClient();
    const { removeDog } = useAppStore();

    return useMutation({
        mutationFn: (id: string) => apiClient.deleteDog(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['dogs'] });
            removeDog(id);
        },
    });
}

/**
 * Hook to fetch hunts
 */
export function useHunts(params?: { limit?: number; offset?: number }) {
    return useQuery({
        queryKey: ['hunts', params],
        queryFn: () => apiClient.getHunts(params),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook to fetch a single hunt
 */
export function useHunt(id: string) {
    return useQuery({
        queryKey: ['hunt', id],
        queryFn: () => apiClient.getHunt(id),
        enabled: !!id,
    });
}

/**
 * Hook to create a hunt
 */
export function useCreateHunt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => apiClient.createHunt(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hunts'] });
        },
    });
}

/**
 * Hook to update a hunt
 */
export function useUpdateHunt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            apiClient.updateHunt(id, data),
        onSuccess: (_, variables) => {
            // Invalidate both the hunt list and the specific hunt detail
            queryClient.invalidateQueries({ queryKey: ['hunts'] });
            queryClient.invalidateQueries({ queryKey: ['hunt', variables.id] });
        },
    });
}

/**
 * Hook to delete a hunt
 */
export function useDeleteHunt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiClient.deleteHunt(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hunts'] });
        },
    });
}

/**
 * Hook to sync with Garmin
 */
export function useGarminSync() {
    return useMutation({
        mutationFn: (daysBack = 7) => apiClient.syncGarmin(daysBack),
    });
}

/**
 * Hook to export data
 */
export function useExportData() {
    return useMutation({
        mutationFn: (format: 'json' | 'csv' | 'gpx' = 'json') =>
            apiClient.exportData(format),
    });
}
