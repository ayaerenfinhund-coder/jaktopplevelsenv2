# Jaktopplevelsen - Komplett Oppsettguide

Dette er en **fullstendig funksjonell** jaktlogg-applikasjon med ekte Garmin Alpha 200 integrasjon, Firebase autentisering, og database.

## 🎯 Hva er implementert (EKTE - Ingen Mock-data)

### ✅ Autentisering
- **Firebase Authentication** med Google Sign-In
- Sikker token-basert API-kommunikasjon
- Automatisk session-håndtering

### ✅ Database
- **Firebase Firestore** for lagring av:
  - Jaktturer med alle detaljer
  - Hunder og deres informasjon
  - GPS-spor fra Garmin
  - Bilder og metadata
  - Brukerinnstillinger

### ✅ Garmin Alpha 200 Integrasjon
- **Ekte Garmin Connect API** integrasjon
- Automatisk synkronisering av GPS-spor
- Henting av aktiviteter fra Garmin Connect
- GPX-parsing og statistikkberegning
- Støtte for flere hunder/halsbånd

### ✅ Funksjoner
- Logg jaktturer med alle detaljer
- GPS-sporkart med Leaflet
- Bildeopplasting og galleri
- Viltobservasjoner og felt vilt
- Værdata fra yr.no
- Hundestatistikk
- Eksport av data (JSON, CSV, GPX)
- Responsive design for mobil og desktop

---

## 📋 Forutsetninger

Du trenger:
1. **Node.js** (v18 eller nyere)
2. **Python** (v3.9 eller nyere)
3. **Firebase-prosjekt** (allerede satt opp)
4. **Garmin Connect-konto** med Alpha 200

---

## 🚀 Oppsett Steg-for-Steg

### 1. Backend Oppsett

#### a) Installer Python-avhengigheter

```bash
cd backend
pip install -r requirements.txt
```

#### b) Konfigurer miljøvariabler

Opprett `backend/.env`:

```env
# Garmin Connect Credentials
GARMIN_USERNAME=din-garmin-epost@example.com
GARMIN_PASSWORD=ditt-garmin-passord

# Firebase Admin SDK
# Last ned service account key fra Firebase Console
FIREBASE_CREDENTIALS_PATH=./firebase-admin-key.json

# API Configuration
API_VERSION=1.0.0
DEBUG=True
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Upload Configuration
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=10
```

#### c) Last ned Firebase Admin SDK Key

1. Gå til [Firebase Console](https://console.firebase.google.com/)
2. Velg ditt prosjekt (`jaktopplevelsen-74086`)
3. Gå til **Project Settings** → **Service Accounts**
4. Klikk **Generate New Private Key**
5. Lagre filen som `backend/firebase-admin-key.json`

#### d) Start backend-serveren

```bash
cd backend
python main.py
```

Backend kjører nå på `http://localhost:8000`

---

### 2. Frontend Oppsett

Frontend er allerede konfigurert! `.env` filen er satt opp med:
- Firebase credentials
- Mapbox token
- API URL

#### Start frontend

```bash
cd frontend
npm install  # Hvis ikke allerede gjort
npm run dev
```

Frontend kjører på `http://localhost:5173`

---

## 🔧 Garmin Connect Oppsett

### Alternativ 1: Bruk eksisterende Garmin-konto (Enklest)

Backend bruker `garminconnect` Python-biblioteket som logger inn med brukernavn/passord:

1. Legg til Garmin-legitimasjon i `backend/.env`
2. Sørg for at Alpha 200 er koblet til Garmin Connect
3. Synkroniser Alpha 200 med Garmin Connect-appen
4. Backend henter automatisk aktiviteter

### Alternativ 2: Garmin Developer API (Mer avansert)

For produksjon bør du bruke Garmin's offisielle OAuth API:

1. Registrer app på https://developer.garmin.com/
2. Få OAuth credentials
3. Implementer OAuth-flow i backend
4. Se `frontend/src/services/garminService.ts` for frontend-kode

---

## 📊 Database-struktur (Firebase Firestore)

### Collections

#### `hunts`
```typescript
{
  id: string;
  user_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location: {
    name: string;
    region: string;
    country: string;
    coordinates: [number, number];
  };
  weather: {
    temperature: number;
    humidity: number;
    wind_speed: number;
    wind_direction: string;
    precipitation: string;
    conditions: string;
  };
  game_type: string[];
  game_seen: Array<{
    type: string;
    count: number;
    time: string;
  }>;
  game_harvested: Array<{
    type: string;
    count: number;
    time: string;
  }>;
  dogs: string[];
  tracks: string[];  // References to track documents
  photos: string[];  // URLs to Firebase Storage
  notes: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}
```

#### `dogs`
```typescript
{
  id: string;
  user_id: string;
  name: string;
  breed: string;
  color: string;
  birth_date: string;
  garmin_device_id?: string;  // For linking to Garmin device
  is_active: boolean;
  created_at: string;
}
```

#### `tracks`
```typescript
{
  id: string;
  user_id: string;
  hunt_id?: string;
  dog_id: string;
  garmin_activity_id?: number;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  gpx_data: string;  // Full GPX XML
  geojson: object;   // GeoJSON LineString
  statistics: {
    distance_km: number;
    duration_minutes: number;
    avg_speed_kmh: number;
    max_speed_kmh: number;
    elevation_gain_m: number;
    elevation_loss_m: number;
  };
  source: 'garmin' | 'manual';
  created_at: string;
}
```

---

## 🔄 Hvordan Garmin-synkronisering fungerer

### Automatisk Synkronisering

1. **Bruker logger inn** med Google
2. **Backend autentiserer** mot Garmin Connect
3. **Hver 30. minutt** (rate-limited):
   - Backend henter nye aktiviteter fra Garmin
   - Parser GPX-data
   - Beregner statistikk
   - Lagrer i Firestore
4. **Frontend viser** nye spor i dashboard

### Manuell Synkronisering

1. Bruker klikker **"Synk med Garmin"**
2. Frontend sender request til backend
3. Backend:
   - Henter aktiviteter fra siste 7 dager
   - Matcher med valgt hund
   - Returnerer GPS-spor
4. Frontend:
   - Viser spor på kart
   - Foreslår lokasjon basert på GPS
   - Lar bruker bekrefte og lagre

### Kode-flyt

```
Frontend (Dashboard.tsx)
  ↓
  handleGarminSync()
  ↓
API Client (apiClient.ts)
  ↓
  POST /api/v1/garmin/sync
  ↓
Backend (api/routes/garmin.py)
  ↓
Garmin Client (garmin/client.py)
  ↓
Garmin Connect API
  ↓
Parse GPX → Calculate Stats → Save to Firestore
  ↓
Return to Frontend
```

---

## 🧪 Testing

### Test Backend

```bash
cd backend
pytest
```

### Test Garmin Connection

```bash
cd backend
python -c "from garmin.client import GarminAlpha200Client; client = GarminAlpha200Client(); print('Auth:', client.authenticate())"
```

### Test Frontend

```bash
cd frontend
npm run build  # Sjekk at alt kompilerer
```

---

## 🐛 Feilsøking

### "Garmin authentication failed"
- Sjekk at brukernavn/passord er riktig i `.env`
- Logg inn på garminconnect.com for å verifisere kontoen
- Sjekk at Alpha 200 er synkronisert med Garmin Connect

### "Firebase permission denied"
- Sjekk at `firebase-admin-key.json` er riktig
- Verifiser Firestore Security Rules i Firebase Console

### "CORS error"
- Sjekk at `CORS_ORIGINS` i backend `.env` inkluderer frontend URL
- Restart backend etter endringer i `.env`

### "No activities found"
- Synkroniser Alpha 200 med Garmin Connect-appen først
- Sjekk at det finnes aktiviteter på garminconnect.com
- Øk `days_back` parameter i sync-kallet

---

## 📱 Produksjonsdeployment

### Backend (Railway/Heroku/DigitalOcean)

1. Sett opp miljøvariabler
2. Deploy med Docker eller direkte
3. Konfigurer HTTPS
4. Oppdater `CORS_ORIGINS`

### Frontend (Netlify/Vercel)

1. Build: `npm run build`
2. Deploy `dist/` folder
3. Sett miljøvariabler:
   - `VITE_API_URL` → Din backend URL
   - Firebase config
   - Mapbox token

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Hunts - kun eier kan lese/skrive
    match /hunts/{huntId} {
      allow read, write: if request.auth != null && 
                         request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null;
    }
    
    // Dogs - kun eier kan lese/skrive
    match /dogs/{dogId} {
      allow read, write: if request.auth != null && 
                         request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null;
    }
    
    // Tracks - kun eier kan lese/skrive
    match /tracks/{trackId} {
      allow read, write: if request.auth != null && 
                         request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null;
    }
  }
}
```

---

## 📚 Nyttige Lenker

- [Garmin Connect API Docs](https://developer.garmin.com/)
- [Firebase Docs](https://firebase.google.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Leaflet Docs](https://leafletjs.com/)

---

## ✅ Sjekkliste for Fullstendig Oppsett

- [ ] Backend kjører på port 8000
- [ ] Frontend kjører på port 5173
- [ ] Firebase Admin SDK key er lastet ned
- [ ] Garmin-legitimasjon er satt i `.env`
- [ ] Kan logge inn med Google
- [ ] Kan synkronisere med Garmin
- [ ] Kan lagre jaktturer
- [ ] Kan laste opp bilder
- [ ] Kan se GPS-spor på kart

---

**Alt er nå ekte data - ingen mock/demo! 🎉**
