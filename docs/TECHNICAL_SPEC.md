# Jaktopplevelsen - Teknisk Spesifikasjon

## Oversikt

Jaktopplevelsen er en komplett nettapplikasjon for jaktlogging med integrering mot Garmin Alpha 200 hundesporing.

## Arkitektur

### Frontend (React + TypeScript)
- **Framework:** React 18 med TypeScript
- **Styling:** Tailwind CSS med egendefinert designsystem
- **State Management:** Zustand + React Query
- **Kart:** Leaflet med React-Leaflet
- **Ruting:** React Router v6
- **Build:** Vite

### Backend (Firebase)
- **Autentisering:** Firebase Auth
- **Database:** Cloud Firestore
- **Fillagring:** Firebase Storage
- **Serverlogikk:** Cloud Functions (Python)
- **Hosting:** Firebase Hosting

## Designsystem

### Fargepalett

```css
/* Primær - Skogsgrønn */
--primary-700: #2D5016;
--primary-500: #4d8f2b;
--primary-400: #69ab43;

/* Sekundær - Jordbrun */
--secondary-700: #8b6914;

/* Aksent - Høstoransje */
--accent-500: #d4752e;

/* Bakgrunn (mørk modus) */
--background: #1A1A1A;
--background-light: #2A2A2A;
--background-lighter: #3A3A3A;

/* Tekst */
--text-primary: #F5F5F5;
--text-secondary: #B0B0B0;
--text-muted: #707070;
```

### Typografi

- **Overskrifter:** Inter Bold
- **Brødtekst:** Inter Regular (16px / 1.5 linjehøyde)
- **Monospace:** JetBrains Mono

### Knappstørrelser

| Størrelse | Padding | Skriftstørrelse |
|-----------|---------|-----------------|
| xs | 10px 6px | 12px |
| sm | 12px 8px | 14px |
| md | 16px 10px | 16px |
| lg | 24px 12px | 18px |
| xl | 32px 16px | 20px |

### Responsivt Design

- **xs:** 475px
- **sm:** 640px
- **md:** 768px
- **lg:** 1024px
- **xl:** 1280px
- **2xl:** 1536px
- **3xl:** 1920px

## Datamodeller

### Bruker
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  settings: UserSettings;
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

### Hund
```typescript
interface Dog {
  id: string;
  user_id: string;
  name: string;
  breed: string;
  birth_date?: Date;
  color: string; // Hex-farge for spor
  garmin_collar_id?: string;
  photo_url?: string;
  notes?: string;
  is_active: boolean;
}
```

### Jakttur
```typescript
interface Hunt {
  id: string;
  user_id: string;
  title: string;
  date: Date;
  start_time: string;
  end_time?: string;
  location: HuntLocation;
  weather?: WeatherConditions;
  game_type: GameType[];
  game_seen: GameObservation[];
  game_harvested: HarvestedGame[];
  dogs: string[]; // Referanser til hund-IDer
  notes: string;
  tags: string[];
  is_favorite: boolean;
}
```

### Spor
```typescript
interface Track {
  id: string;
  hunt_id: string;
  dog_id?: string;
  name: string;
  source: 'garmin' | 'gpx_import' | 'manual';
  gpx_data?: string;
  geojson: GeoJSONLineString;
  statistics: TrackStatistics;
  color: string;
  start_time: Timestamp;
  end_time: Timestamp;
}
```

## API-endepunkter (Cloud Functions)

### Autentisering
- POST `/auth/register` - Registrer ny bruker
- POST `/auth/login` - Logg inn
- GET `/auth/me` - Hent brukerinfo

### Jaktturer (Firestore direkte)
- Firestore Collection: `users/{userId}/hunts`

### Garmin-integrasjon
- `syncGarmin` - Synkroniser spor fra Garmin Connect
- `parseGPX` - Parse GPX-fil til GeoJSON

### Eksport
- `exportHunts` - Eksporter jaktturer (JSON/GPX/KML)
- `getStatistics` - Hent brukerstatistikk

## Sikkerhetsregler

### Firestore
```javascript
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}

match /users/{userId}/hunts/{huntId} {
  allow read, write: if request.auth.uid == userId;
}
```

### Storage
```javascript
match /users/{userId}/{allPaths=**} {
  allow read, write: if request.auth.uid == userId
    && request.resource.size < 50MB
    && request.resource.contentType.matches('image/.*');
}
```

## Ytelsesoptimalisering

### Frontend
- Lazy loading av sider
- Bildekomprimering (WebP)
- Leaflet tile caching
- React Query caching (5 min stale time)
- Code splitting via Vite

### Backend
- Firestore-indekser for vanlige spørringer
- Cloud Functions i Europa (europe-west1)
- Thumbnail-generering for bilder

## Sikkerhetskopi og Eksport

### Støttede formater
- **JSON:** Komplett dataeksport
- **GPX:** GPS-spordata
- **KML:** Google Earth-kompatibel

### Lagringsgrenser
- Maks filstørrelse: 50MB
- Tillatte bildetyper: JPG, PNG, WebP
- Tillatte GPS-filer: GPX, FIT

## Oppsett

### Forutsetninger
- Node.js 18+
- Python 3.11+
- Firebase CLI
- Garmin Connect-konto (for synkronisering)

### Installasjon

```bash
# Frontend
cd frontend
npm install
cp .env.example .env
# Rediger .env med Firebase-konfigurasjon
npm run dev

# Firebase Functions
cd functions
pip install -r requirements.txt

# Deploy
firebase deploy
```

## Testing

### Frontend
```bash
npm run lint
npm run build
```

### Backend
```bash
pytest
black .
flake8 .
```

## Fremtidig Utvikling

- [ ] Offline-støtte med Service Worker
- [ ] Push-varsler
- [ ] Værdata-integrasjon
- [ ] Deling av jaktturer
- [ ] Statistikkdashboard
- [ ] Mobil-app (React Native)
