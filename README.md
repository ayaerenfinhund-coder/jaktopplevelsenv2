# 🎯 Jaktopplevelsen

**En fullstendig funksjonell jaktlogg-applikasjon med ekte Garmin Alpha 200 integrasjon**

> ⚠️ **Dette er IKKE en demo** - Dette er et komplett, produksjonsklart system med ekte Garmin API-integrasjon, Firebase-database, og full funksjonalitet.

## 🌟 Funksjoner

### ✅ Ekte Garmin Alpha 200 Integrasjon
- Automatisk synkronisering av GPS-spor fra Garmin Connect
- Henting av aktiviteter og spordata
- GPX-parsing og statistikkberegning
- Støtte for flere hunder/halsbånd
- Automatisk stedsgjenkjenning fra GPS-koordinater

### ✅ Komplett Jaktlogging
- Registrer jaktturer med alle detaljer
- Viltobservasjoner (sett og felt)
- Værdata fra yr.no (automatisk)
- GPS-sporkart med Leaflet
- Bildeopplasting og galleri
- Notater og tags

### ✅ Hundeadministrasjon
- Registrer flere hunder
- Koble hunder til Garmin-enheter
- Hundestatistikk og historikk
- Aktiv/inaktiv status

### ✅ Statistikk og Analyse
- Sesongstatistikk
- Hundestatistikk
- GPS-analyse
- Eksport av data (JSON, CSV, GPX)

### ✅ Moderne UX/UI
- Responsive design (mobil og desktop)
- Dark mode
- Smooth animasjoner
- Intuitive filtre
- PWA-støtte (installer som app)

## 🏗️ Teknisk Stack

### Frontend
- **React 18** med TypeScript
- **Vite** for rask utvikling
- **TailwindCSS** for styling
- **Firebase Auth** for autentisering
- **Leaflet** for kart
- **React Query** for data-håndtering
- **Zustand** for state management

### Backend
- **FastAPI** (Python)
- **Firebase Firestore** for database
- **Garmin Connect API** for GPS-data
- **GPX parsing** med gpxpy
- **OAuth 2.0** autentisering

## 📦 Installasjon

Se [SETUP_GUIDE.md](./SETUP_GUIDE.md) for komplett oppsettguide.

### Quick Start

```bash
# 1. Clone repository
git clone <repo-url>
cd jaktopplevelsen

# 2. Backend setup
cd backend
pip install -r requirements.txt
cp .env.example .env
# Rediger .env med dine Garmin og Firebase credentials
python main.py

# 3. Frontend setup (i ny terminal)
cd frontend
npm install
npm run dev
```

## 🔐 Påkrevd Konfigurasjon

### 1. Firebase
- Opprett Firebase-prosjekt på https://console.firebase.google.com/
- Aktiver Authentication (Google Sign-In)
- Aktiver Firestore Database
- Last ned Admin SDK key

### 2. Garmin Connect
- Garmin Connect-konto med Alpha 200
- Legg til legitimasjon i `backend/.env`

### 3. Mapbox (for kart)
- Gratis API-nøkkel fra https://www.mapbox.com/
- Allerede inkludert i `.env`

## 📖 Dokumentasjon

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Komplett oppsettguide
- [API Documentation](http://localhost:8000/docs) - Automatisk generert API-dokumentasjon (når backend kjører)

## 🔄 Hvordan Garmin-synkronisering Fungerer

1. **Autentisering**: Backend logger inn på Garmin Connect med dine credentials
2. **Henting**: Henter aktiviteter fra Alpha 200 via Garmin Connect API
3. **Parsing**: Konverterer GPX-data til brukbar format
4. **Lagring**: Lagrer spor og statistikk i Firestore
5. **Visning**: Frontend viser spor på kart med all statistikk

```
Alpha 200 → Garmin Connect → Backend API → Firestore → Frontend
```

## 🎨 Skjermbilder

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### GPS-sporkart
![Map](docs/screenshots/map.png)

### Hundestatistikk
![Stats](docs/screenshots/stats.png)

## 🚀 Deployment

### Backend
- Railway, Heroku, eller DigitalOcean
- Krever Python 3.9+
- Sett miljøvariabler for produksjon

### Frontend
- Netlify eller Vercel
- Build: `npm run build`
- Deploy `dist/` folder

## 🐛 Feilsøking

Se [SETUP_GUIDE.md](./SETUP_GUIDE.md#-feilsøking) for vanlige problemer og løsninger.

## 📝 Lisens

MIT License - Se [LICENSE](./LICENSE) for detaljer

## 🤝 Bidrag

Bidrag er velkommen! Åpne en issue eller pull request.

## 📧 Kontakt

For spørsmål eller support, åpne en issue på GitHub.

---

**Laget med ❤️ for jegere og hundeeiere**
