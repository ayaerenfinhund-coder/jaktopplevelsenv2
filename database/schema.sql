-- Jaktopplevelsen Database Schema
-- PostgreSQL 14+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    settings JSONB DEFAULT '{
        "theme": "dark",
        "language": "no",
        "units": "metric",
        "map_style": "terrain",
        "auto_sync_garmin": false,
        "notification_preferences": {
            "email_summary": true,
            "new_track_imported": true,
            "backup_reminder": true
        }
    }'::jsonb,
    garmin_credentials JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dogs table
CREATE TABLE dogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    breed VARCHAR(100) NOT NULL,
    birth_date DATE,
    color VARCHAR(7) NOT NULL DEFAULT '#FF6B6B', -- Hex color for track
    garmin_collar_id VARCHAR(100),
    photo_url TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dogs_user_id ON dogs(user_id);

-- Hunts table
CREATE TABLE hunts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    location JSONB NOT NULL, -- {name, region, country, coordinates, bounds}
    weather JSONB, -- {temperature, humidity, wind_speed, wind_direction, precipitation, conditions}
    game_type TEXT[] DEFAULT '{}',
    game_seen JSONB DEFAULT '[]'::jsonb,
    game_harvested JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    summary TEXT,
    tags TEXT[] DEFAULT '{}',
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hunts_user_id ON hunts(user_id);
CREATE INDEX idx_hunts_date ON hunts(date DESC);
CREATE INDEX idx_hunts_tags ON hunts USING GIN(tags);
CREATE INDEX idx_hunts_game_type ON hunts USING GIN(game_type);

-- Hunt-Dog association table
CREATE TABLE hunt_dogs (
    hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
    dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
    PRIMARY KEY (hunt_id, dog_id)
);

-- Tracks table (GPS tracks from Garmin or GPX imports)
CREATE TABLE tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
    dog_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('garmin', 'gpx_import', 'manual')),
    gpx_data TEXT, -- Original GPX XML
    geojson JSONB NOT NULL, -- GeoJSON LineString
    statistics JSONB NOT NULL, -- distance, duration, elevation, etc.
    color VARCHAR(7) NOT NULL DEFAULT '#4ECDC4',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tracks_hunt_id ON tracks(hunt_id);
CREATE INDEX idx_tracks_dog_id ON tracks(dog_id);

-- Photos table
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    caption TEXT,
    taken_at TIMESTAMP WITH TIME ZONE,
    location JSONB, -- {lat, lng}
    exif_data JSONB,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_photos_hunt_id ON photos(hunt_id);
CREATE INDEX idx_photos_tags ON photos USING GIN(tags);

-- Garmin sync log
CREATE TABLE garmin_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sync_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sync_completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
    tracks_imported INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_garmin_sync_user_id ON garmin_sync_logs(user_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dogs_updated_at
    BEFORE UPDATE ON dogs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hunts_updated_at
    BEFORE UPDATE ON hunts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- Hunt summary view
CREATE VIEW hunt_summaries AS
SELECT
    h.id,
    h.user_id,
    h.title,
    h.date,
    h.start_time,
    h.end_time,
    h.location->>'name' as location_name,
    h.location->>'region' as location_region,
    h.game_type,
    jsonb_array_length(h.game_seen) as total_game_seen,
    jsonb_array_length(h.game_harvested) as total_game_harvested,
    h.is_favorite,
    h.tags,
    (SELECT COUNT(*) FROM hunt_dogs hd WHERE hd.hunt_id = h.id) as dog_count,
    (SELECT COUNT(*) FROM tracks t WHERE t.hunt_id = h.id) as track_count,
    (SELECT COUNT(*) FROM photos p WHERE p.hunt_id = h.id) as photo_count,
    (SELECT COALESCE(SUM((t.statistics->>'distance_km')::float), 0)
     FROM tracks t WHERE t.hunt_id = h.id) as total_distance_km,
    h.created_at,
    h.updated_at
FROM hunts h;

-- User statistics view
CREATE VIEW user_statistics AS
SELECT
    u.id as user_id,
    (SELECT COUNT(*) FROM hunts h WHERE h.user_id = u.id) as total_hunts,
    (SELECT COUNT(*) FROM dogs d WHERE d.user_id = u.id AND d.is_active = TRUE) as active_dogs,
    (SELECT COALESCE(SUM((t.statistics->>'distance_km')::float), 0)
     FROM hunts h
     JOIN tracks t ON t.hunt_id = h.id
     WHERE h.user_id = u.id) as total_distance_km,
    (SELECT COUNT(*) FROM photos p
     JOIN hunts h ON p.hunt_id = h.id
     WHERE h.user_id = u.id) as total_photos,
    (SELECT COALESCE(SUM((t.statistics->>'duration_minutes')::int), 0)
     FROM hunts h
     JOIN tracks t ON t.hunt_id = h.id
     WHERE h.user_id = u.id) as total_duration_minutes
FROM users u;
