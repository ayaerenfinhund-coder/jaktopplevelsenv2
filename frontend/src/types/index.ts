// Core data types for Jaktopplevelsen

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  settings: UserSettings;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  language: 'no' | 'en';
  units: 'metric' | 'imperial';
  map_style: 'satellite' | 'terrain' | 'standard';
  auto_sync_garmin: boolean;
  notification_preferences: NotificationPreferences;
}

export interface NotificationPreferences {
  email_summary: boolean;
  new_track_imported: boolean;
  backup_reminder: boolean;
}

export interface Dog {
  id: string;
  user_id: string;
  name: string;
  breed: string;
  birth_date?: string;
  color: string; // Hex color for track visualization
  garmin_collar_id?: string;
  photo_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Hunt {
  id: string;
  user_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time?: string;
  location: HuntLocation;
  weather?: WeatherConditions;
  game_type: GameType[];
  game_seen: GameObservation[];
  game_harvested: HarvestedGame[];
  dogs: string[]; // Dog IDs
  tracks: Track[];
  photos: Photo[];
  notes: string;
  summary?: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface HuntLocation {
  name: string;
  region?: string;
  country: string;
  coordinates: [number, number]; // [lat, lng]
  bounds?: [[number, number], [number, number]]; // SW, NE corners
}

export interface WeatherConditions {
  temperature: number; // Celsius
  humidity: number; // Percentage
  wind_speed: number; // m/s
  wind_direction: string;
  precipitation: 'none' | 'light' | 'moderate' | 'heavy';
  conditions: 'clear' | 'cloudy' | 'overcast' | 'rain' | 'snow' | 'fog';
}

export type GameType =
  | 'moose'
  | 'deer'
  | 'roe_deer'
  | 'wild_boar'
  | 'fox'
  | 'hare'
  | 'grouse'
  | 'ptarmigan'
  | 'capercaillie'
  | 'black_grouse'
  | 'duck'
  | 'goose'
  | 'other';

export interface GameObservation {
  type: GameType;
  count: number;
  time: string;
  location?: [number, number];
  notes?: string;
}

export interface HarvestedGame {
  type: GameType;
  count: number;
  weight?: number; // kg
  time: string;
  location?: [number, number];
  photos?: string[]; // Photo IDs
  notes?: string;
}

export interface Track {
  id: string;
  hunt_id: string;
  dog_id?: string;
  name: string;
  source: 'garmin' | 'gpx_import' | 'manual';
  gpx_data?: string;
  geojson: GeoJSONLineString;
  statistics: TrackStatistics;
  color: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number, number?, number?][]; // [lng, lat, elevation?, time?]
}

export interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: GeoJSONLineString;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface TrackStatistics {
  distance_km: number;
  duration_minutes: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  min_elevation_m: number;
  max_elevation_m: number;
  bounding_box: [[number, number], [number, number]];
}

export interface Photo {
  id: string;
  hunt_id: string;
  filename: string;
  url: string;
  thumbnail_url: string;
  caption?: string;
  taken_at?: string;
  location?: [number, number];
  tags: string[];
  created_at: string;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  elevation?: number;
  time: string;
  speed?: number;
  heart_rate?: number;
}

// API Response types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
  status_code: number;
  timestamp: string;
}

// Filter and search types
export interface HuntFilters {
  date_from?: string;
  date_to?: string;
  game_types?: GameType[];
  dogs?: string[];
  tags?: string[];
  location?: string;
  has_photos?: boolean;
  is_favorite?: boolean;
}

export interface SearchParams {
  query: string;
  filters: HuntFilters;
  sort_by: 'date' | 'title' | 'duration' | 'distance';
  sort_order: 'asc' | 'desc';
  page: number;
  page_size: number;
}

// Garmin Integration types
export interface GarminDevice {
  id: string;
  name: string;
  type: string;
  last_sync: string;
}

export interface GarminSyncStatus {
  is_syncing: boolean;
  last_sync?: string;
  tracks_imported: number;
  error?: string;
}

// Export types
export type ExportFormat = 'gpx' | 'kml' | 'json' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  hunt_ids: string[];
  include_tracks: boolean;
  include_photos: boolean;
  include_metadata: boolean;
}

// UI State types
export interface MapViewport {
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]];
}

export interface TimelineState {
  is_playing: boolean;
  current_time: number; // Unix timestamp
  playback_speed: number; // 1x, 2x, 4x, etc.
  start_time: number;
  end_time: number;
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}
