"""
Jaktopplevelsen - Backend API
Hovedinngang for FastAPI-applikasjonen
"""

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
from dotenv import load_dotenv

from api.routes import auth, hunts, dogs, tracks, photos, garmin_routes, exports
from models import Base, engine

# Last miljøvariabler
load_dotenv()

# Konfigurer logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Oppstartslogikk for applikasjonen."""
    logger.info("Starter Jaktopplevelsen API...")

    # Opprett databasetabeller
    Base.metadata.create_all(bind=engine)
    logger.info("Database tabeller opprettet")

    # Opprett opplastningsmapper
    upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
    os.makedirs(upload_dir, exist_ok=True)
    os.makedirs(f"{upload_dir}/photos", exist_ok=True)
    os.makedirs(f"{upload_dir}/thumbnails", exist_ok=True)
    os.makedirs(f"{upload_dir}/gpx", exist_ok=True)
    logger.info(f"Opplastingsmapper opprettet i {upload_dir}")

    yield

    logger.info("Avslutter Jaktopplevelsen API...")


# Opprett FastAPI-app
app = FastAPI(
    title="Jaktopplevelsen API",
    description="Backend API for jaktlogg med Garmin Alpha 200 integrasjon",
    version=os.getenv("API_VERSION", "1.0.0"),
    lifespan=lifespan,
)

# CORS-konfigurasjon
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Feilhåndtering
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Ubehandlet feil: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "En intern serverfeil oppstod",
            "status_code": 500,
        },
    )


# Registrer API-ruter
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autentisering"])
app.include_router(hunts.router, prefix="/api/v1/hunts", tags=["Jaktturer"])
app.include_router(dogs.router, prefix="/api/v1/dogs", tags=["Hunder"])
app.include_router(tracks.router, prefix="/api/v1/tracks", tags=["Spor"])
app.include_router(photos.router, prefix="/api/v1/photos", tags=["Bilder"])
app.include_router(garmin_routes.router, prefix="/api/v1/garmin", tags=["Garmin"])
app.include_router(exports.router, prefix="/api/v1/exports", tags=["Eksport"])

# Statiske filer for opplastninger
upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
if os.path.exists(upload_dir):
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")


@app.get("/", tags=["Helse"])
async def root():
    """Rotendepunkt for helsesjekk."""
    return {
        "melding": "Velkommen til Jaktopplevelsen API",
        "versjon": os.getenv("API_VERSION", "1.0.0"),
        "status": "aktiv",
    }


@app.get("/health", tags=["Helse"])
async def health_check():
    """Helsesjekk-endepunkt."""
    return {
        "status": "frisk",
        "database": "tilkoblet",
        "versjon": os.getenv("API_VERSION", "1.0.0"),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("DEBUG", "True").lower() == "true",
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )
