from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from datetime import datetime, timedelta
import logging
import tempfile
import os
import shutil

from api.deps import get_current_user
# Bruk absolutt import for å unngå forvirring
import garmin.client as garmin_client
from models.schemas import GarminActivity, GarminCredentials, TrackCreate

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/login", response_model=bool)
async def login_garmin(
    credentials: GarminCredentials,
    current_user: dict = Depends(get_current_user)
):
    """Logg inn på Garmin Connect."""
    client = garmin_client.GarminAlpha200Client(credentials.email, credentials.password)
    if client.authenticate():
        return True
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kunne ikke autentisere mot Garmin Connect. Sjekk brukernavn og passord."
    )

@router.post("/sync", response_model=List[dict])
async def sync_garmin(
    days_back: int = 7,
    current_user: dict = Depends(get_current_user)
):
    """Synkroniser aktiviteter fra Garmin Connect."""
    # Hent lagrede credentials fra bruker (i en ekte app)
    # For nå bruker vi miljøvariabler eller krever login først
    client = garmin_client.GarminAlpha200Client()
    
    if not client.authenticate():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ikke autentisert mot Garmin Connect"
        )
        
    try:
        tracks = client.sync_activities(days_back=days_back)
        return tracks
    except Exception as e:
        logger.error(f"Feil ved synkronisering: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Feil ved synkronisering: {str(e)}"
        )

@router.get("/activities", response_model=List[dict])
async def get_activities(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Hent aktiviteter uten å laste ned fulle spor (raskere)."""
    client = garmin_client.GarminAlpha200Client()
    
    if not client.authenticate():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ikke autentisert mot Garmin Connect"
        )
        
    try:
        # Konverter datoer
        start = datetime.fromisoformat(start_date) if start_date else None
        end = datetime.fromisoformat(end_date) if end_date else None
        
        activities = client.get_activities(start, end)
        
        # Map til forenklet format
        result = []
        for act in activities:
            result.append({
                "activityId": act.get("activityId"),
                "activityName": act.get("activityName"),
                "startTimeLocal": act.get("startTimeLocal"),
                "distance": act.get("distance"),
                "duration": act.get("duration"),
                "averageSpeed": act.get("averageSpeed"),
                "maxSpeed": act.get("maxSpeed"),
                "dog_id": None 
            })
            
        return result
    except Exception as e:
        logger.error(f"Feil ved henting av aktiviteter: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/upload-gpx", response_model=dict)
async def upload_gpx(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Last opp en GPX-fil manuelt og parse den til spor-data.
    Dette er en fallback for Alpha 200 brukere som ikke får synkronisert via Connect.
    """
    if not file.filename.endswith('.gpx'):
        raise HTTPException(status_code=400, detail="Filen må være en GPX-fil")
        
    try:
        # Lagre filen midlertidig
        with tempfile.NamedTemporaryFile(delete=False, suffix=".gpx") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
            
        # Les filinnhold
        with open(tmp_path, 'r', encoding='utf-8') as f:
            gpx_content = f.read()
            
        # Slett midlertidig fil
        os.unlink(tmp_path)
        
        # Bruk klienten til å parse (selv om vi ikke er logget inn)
        client = garmin_client.GarminAlpha200Client() # Trenger ikke auth for parsing
        
        geojson = client.parse_gpx_to_geojson(gpx_content)
        stats = client.calculate_track_statistics(gpx_content)
        
        # Returner strukturert data klar for frontend
        return {
            "garmin_activity_id": None, # Manuell opplasting
            "name": file.filename.replace('.gpx', ''),
            "gpx_data": gpx_content,
            "geojson": geojson,
            "statistics": stats,
            "start_time": datetime.now().isoformat(), # Bør egentlig hentes fra GPX
            "end_time": None,
            "source": "manual_upload"
        }
        
    except Exception as e:
        logger.error(f"Feil ved parsing av GPX: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kunne ikke lese GPX-fil: {str(e)}"
        )
