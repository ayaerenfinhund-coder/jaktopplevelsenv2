/**
 * API Client for Jaktopplevelsen - Firebase Edition
 * Handles all communication directly with Firebase services
 */

import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    Timestamp
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL
} from 'firebase/storage';
import { db, storage, auth } from '../lib/firebase';
import * as toGeoJSON from '@tmcw/togeojson';

class ApiClient {
    private getUserId(): string {
        const user = auth.currentUser;
        if (!user) {
            console.error('Authentication error: No current user found');
            console.error('Auth state:', {
                currentUser: auth.currentUser,
                authInitialized: !!auth
            });
            throw new Error('Du er ikke innlogget. Vennligst logg inn på nytt.');
        }
        return user.uid;
    }

    // Hunts
    async getHunts(_params?: { limit?: number; offset?: number }): Promise<any[]> {
        try {
            const userId = this.getUserId();
            const huntsRef = collection(db, 'hunts');
            // Removed orderBy temporarily to avoid needing a composite index immediately.
            // Sorting can be done client-side for now.
            const q = query(huntsRef, where('userId', '==', userId));

            const snapshot = await getDocs(q);
            const hunts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Client-side sort
            return hunts.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } catch (error) {
            console.error("Error fetching hunts:", error);
            throw error;
        }
    }

    async getHunt(id: string): Promise<any> {
        const docRef = doc(db, 'hunts', id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error('Hunt not found');
        return { id: docSnap.id, ...docSnap.data() };
    }

    private cleanData(data: any): any {
        if (Array.isArray(data)) {
            return data
                .map(item => this.cleanData(item))
                .filter(item => item !== undefined);
        } else if (data !== null && typeof data === 'object' && !(data instanceof Timestamp)) {
            return Object.entries(data).reduce((acc, [key, value]) => {
                if (value !== undefined) {
                    acc[key] = this.cleanData(value);
                }
                return acc;
            }, {} as any);
        }
        return data;
    }

    async createHunt(data: any): Promise<any> {
        const userId = this.getUserId();
        const huntsRef = collection(db, 'hunts');

        const newHunt = this.cleanData({
            ...data,
            userId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        const docRef = await addDoc(huntsRef, newHunt);
        return { id: docRef.id, ...newHunt };
    }

    async updateHunt(id: string, data: any): Promise<any> {
        const docRef = doc(db, 'hunts', id);
        const updates = this.cleanData({
            ...data,
            updatedAt: Timestamp.now()
        });
        await updateDoc(docRef, updates);
        return this.getHunt(id);
    }

    async deleteHunt(id: string): Promise<void> {
        await deleteDoc(doc(db, 'hunts', id));
    }

    // Dogs
    async getDogs(): Promise<any[]> {
        const userId = this.getUserId();
        const dogsRef = collection(db, 'dogs');
        const q = query(dogsRef, where('userId', '==', userId));

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async createDog(data: any): Promise<any> {
        const userId = this.getUserId();
        const dogsRef = collection(db, 'dogs');

        const newDog = this.cleanData({
            ...data,
            userId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        const docRef = await addDoc(dogsRef, newDog);
        return { id: docRef.id, ...newDog };
    }

    async updateDog(id: string, data: any): Promise<any> {
        const docRef = doc(db, 'dogs', id);
        const updates = this.cleanData({
            ...data,
            updatedAt: Timestamp.now()
        });
        await updateDoc(docRef, updates);
        return { id, ...data }; // Return updated data
    }

    async deleteDog(id: string): Promise<void> {
        await deleteDoc(doc(db, 'dogs', id));
    }

    // Garmin / GPX
    // Since we don't have a backend to sync with Garmin Connect, we rely on manual GPX upload
    // or we could implement a client-side Garmin scraper (very hard due to CORS).
    // For now, we stick to the robust GPX upload.

    async syncGarmin(_daysBack = 7): Promise<any[]> {
        console.warn("Direct Garmin sync is not supported in serverless mode. Please use GPX upload.");
        return [];
    }

    async loginGarmin(_credentials: any): Promise<boolean> {
        console.warn("Garmin login is not supported in serverless mode.");
        return false;
    }

    async getGarminActivities(_startDate: string, _endDate: string): Promise<any[]> {
        console.warn("Garmin activities fetch not supported in serverless mode.");
        return [];
    }

    async uploadGpx(file: File): Promise<any> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const gpxString = e.target?.result as string;
                    const parser = new DOMParser();
                    const gpx = parser.parseFromString(gpxString, "text/xml");
                    const geojson = toGeoJSON.gpx(gpx);

                    // Find the first LineString feature (track or route)
                    const trackFeature = geojson.features?.find(f =>
                        f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'
                    );

                    if (!trackFeature) {
                        throw new Error('Ingen spor (track/route) funnet i GPX-filen.');
                    }

                    // Try to extract start time from GPX
                    let startTime = new Date().toISOString();

                    if (trackFeature.properties?.coordTimes?.[0]) {
                        startTime = trackFeature.properties.coordTimes[0];
                    } else if (trackFeature.properties?.time) {
                        startTime = trackFeature.properties.time;
                    } else {
                        // Fallback: check metadata time
                        const metadataTime = gpx.querySelector('metadata > time')?.textContent;
                        if (metadataTime) startTime = metadataTime;
                    }

                    // Basic statistics calculation
                    const stats = this.calculateTrackStats(trackFeature);

                    resolve({
                        name: file.name.replace('.gpx', ''),
                        geojson, // Keep all features (waypoints etc) for map
                        statistics: stats,
                        start_time: startTime,
                        source: 'manual_upload'
                    });
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    private calculateTrackStats(feature: any) {
        // Simple client-side stats calculation
        // This is a simplified version. Real distance calc requires Haversine formula.
        let distance = 0;
        const coords = feature.geometry.coordinates || [];

        // Handle MultiLineString if necessary (flatten or iterate)
        // For now assuming LineString as per toGeoJSON output for simple tracks
        if (feature.geometry.type === 'LineString') {
            for (let i = 1; i < coords.length; i++) {
                const [lon1, lat1] = coords[i - 1];
                const [lon2, lat2] = coords[i];
                distance += this.haversineDistance(lat1, lon1, lat2, lon2);
            }
        }

        return {
            distance_km: parseFloat(distance.toFixed(2)),
            duration_minutes: 0, // Hard to calc without timestamps in simple geojson
            avg_speed_kmh: 0
        };
    }

    private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    }

    private deg2rad(deg: number) {
        return deg * (Math.PI / 180);
    }

    // Photos
    async uploadPhoto(file: File, huntId: string): Promise<any> {
        const userId = this.getUserId();
        const storageRef = ref(storage, `users/${userId}/hunts/${huntId}/${file.name}`);

        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);

        return {
            url,
            filename: file.name,
            path: snapshot.ref.fullPath
        };
    }

    async deletePhoto(_photoId: string): Promise<void> {
        // In this simplified version, photoId is expected to be the full path or url
        // Ideally we store photo metadata in Firestore to map ID to Path.
        // For now, let's assume we can't easily delete without the path.
        console.warn("Delete photo not fully implemented in serverless mode without metadata tracking");
    }

    // Exports
    async exportData(_format: 'json' | 'csv' | 'gpx' = 'json'): Promise<Blob> {
        // Client-side export
        const hunts = await this.getHunts();
        const data = JSON.stringify(hunts, null, 2);
        return new Blob([data], { type: 'application/json' });
    }
}

export const apiClient = new ApiClient();
