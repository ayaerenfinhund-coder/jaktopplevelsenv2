/**
 * Garmin Connect API Integration
 * 
 * This service handles authentication and data fetching from Garmin Connect.
 * 
 * IMPORTANT: You need to:
 * 1. Register your app at https://developer.garmin.com/
 * 2. Get OAuth credentials (Consumer Key & Secret)
 * 3. Set up a backend proxy to handle OAuth flow (Garmin doesn't support PKCE)
 * 4. Add environment variables for Garmin credentials
 */

interface GarminActivity {
    activityId: number;
    activityName: string;
    startTimeGMT: string;
    distance: number; // meters
    duration: number; // seconds
    averageSpeed: number;
    maxSpeed: number;
    startLatitude: number;
    startLongitude: number;
    hasPolyline: boolean;
}

interface GarminTrackPoint {
    latitude: number;
    longitude: number;
    elevation: number;
    timestamp: string;
    speed: number;
}

interface GarminAuthTokens {
    accessToken: string;
    accessTokenSecret: string;
    expiresAt: number;
}

class GarminService {
    private baseUrl = '/api/garmin'; // Your backend proxy
    private tokens: GarminAuthTokens | null = null;

    /**
     * Check if user is authenticated with Garmin
     */
    isAuthenticated(): boolean {
        const stored = localStorage.getItem('garmin_tokens');
        if (!stored) return false;

        try {
            const tokens = JSON.parse(stored) as GarminAuthTokens;
            // Check if token is expired (with 5 min buffer)
            return tokens.expiresAt > Date.now() + 5 * 60 * 1000;
        } catch {
            return false;
        }
    }

    /**
     * Initiate OAuth flow with Garmin Connect
     * This will redirect to Garmin's login page
     */
    async initiateAuth(): Promise<void> {
        try {
            // Step 1: Get request token from your backend
            const response = await fetch(`${this.baseUrl}/auth/request-token`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to get request token');
            }

            const { authUrl } = await response.json();

            // Step 2: Redirect to Garmin's authorization page
            window.location.href = authUrl;
        } catch (error) {
            console.error('Garmin auth error:', error);
            throw new Error('Kunne ikke starte Garmin-pålogging');
        }
    }

    /**
     * Complete OAuth flow after redirect back from Garmin
     */
    async completeAuth(oauthToken: string, oauthVerifier: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/auth/access-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ oauthToken, oauthVerifier }),
            });

            if (!response.ok) {
                throw new Error('Failed to get access token');
            }

            const tokens = await response.json();

            // Store tokens (expires in 1 year for Garmin)
            const authTokens: GarminAuthTokens = {
                accessToken: tokens.accessToken,
                accessTokenSecret: tokens.accessTokenSecret,
                expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
            };

            localStorage.setItem('garmin_tokens', JSON.stringify(authTokens));
            this.tokens = authTokens;
        } catch (error) {
            console.error('Garmin auth completion error:', error);
            throw new Error('Kunne ikke fullføre Garmin-pålogging');
        }
    }

    /**
     * Disconnect Garmin account
     */
    disconnect(): void {
        localStorage.removeItem('garmin_tokens');
        this.tokens = null;
    }

    /**
     * Fetch recent activities from Garmin Connect
     */
    async getRecentActivities(limit = 20): Promise<GarminActivity[]> {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated with Garmin');
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/activities?limit=${limit}`,
                {
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    this.disconnect();
                    throw new Error('Garmin session expired');
                }
                throw new Error('Failed to fetch activities');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching Garmin activities:', error);
            throw error;
        }
    }

    /**
     * Get detailed GPS track for an activity
     */
    async getActivityTrack(activityId: number): Promise<GarminTrackPoint[]> {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated with Garmin');
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/activities/${activityId}/track`,
                {
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch activity track');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching activity track:', error);
            throw error;
        }
    }

    /**
     * Find activities for a specific date and dog
     * This is the main function used by the hunt logging feature
     */
    async findActivitiesForDate(date: string, dogId?: string): Promise<GarminActivity[]> {
        const activities = await this.getRecentActivities(50);

        // Filter by date
        const targetDate = new Date(date).toISOString().split('T')[0];
        const filtered = activities.filter(activity => {
            const activityDate = new Date(activity.startTimeGMT).toISOString().split('T')[0];
            return activityDate === targetDate;
        });

        // TODO: Filter by dog if you have a way to identify which device/dog
        // This might require matching device IDs or activity names

        return filtered;
    }

    /**
     * Detect location name from GPS coordinates using reverse geocoding
     */
    async detectLocation(latitude: number, longitude: number): Promise<string | null> {
        try {
            // Using Kartverket's reverse geocoding API (Norwegian)
            const url = `https://ws.geonorge.no/stedsnavn/v1/punkt?nord=${latitude}&ost=${longitude}&koordsys=4258&radius=1000&treffPerSide=1`;

            const response = await fetch(url);
            if (!response.ok) return null;

            const data = await response.json();
            if (data.navn && data.navn.length > 0) {
                return data.navn[0].stedsnavn[0].skrivemåte;
            }

            return null;
        } catch (error) {
            console.error('Error detecting location:', error);
            return null;
        }
    }
}

export const garminService = new GarminService();
export type { GarminActivity, GarminTrackPoint };
