"""
Ruter for jaktturer.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, date, time
from typing import Optional, List
from uuid import UUID

from models import get_db, User, Hunt, Dog
from api.routes.auth import get_current_user

router = APIRouter()


# Pydantic-modeller
class HuntLocation(BaseModel):
    name: str
    region: Optional[str] = None
    country: str = "Norge"
    coordinates: List[float]  # [lat, lng]
    bounds: Optional[List[List[float]]] = None


class WeatherConditions(BaseModel):
    temperature: float
    humidity: float
    wind_speed: float
    wind_direction: str
    precipitation: str
    conditions: str


class GameObservation(BaseModel):
    type: str
    count: int
    time: str
    location: Optional[List[float]] = None
    notes: Optional[str] = None


class HarvestedGame(BaseModel):
    type: str
    count: int
    weight: Optional[float] = None
    time: str
    location: Optional[List[float]] = None
    photos: Optional[List[str]] = None
    notes: Optional[str] = None


class HuntCreate(BaseModel):
    title: str
    date: date
    start_time: time
    end_time: Optional[time] = None
    location: HuntLocation
    weather: Optional[WeatherConditions] = None
    game_type: List[str] = []
    game_seen: List[GameObservation] = []
    game_harvested: List[HarvestedGame] = []
    dog_ids: List[str] = []
    notes: Optional[str] = None
    summary: Optional[str] = None
    tags: List[str] = []
    is_favorite: bool = False


class HuntUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    location: Optional[HuntLocation] = None
    weather: Optional[WeatherConditions] = None
    game_type: Optional[List[str]] = None
    game_seen: Optional[List[GameObservation]] = None
    game_harvested: Optional[List[HarvestedGame]] = None
    dog_ids: Optional[List[str]] = None
    notes: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None


class HuntResponse(BaseModel):
    id: str
    user_id: str
    title: str
    date: date
    start_time: time
    end_time: Optional[time] = None
    location: dict
    weather: Optional[dict] = None
    game_type: List[str]
    game_seen: List[dict]
    game_harvested: List[dict]
    dogs: List[dict]
    tracks: List[dict]
    photos: List[dict]
    notes: Optional[str] = None
    summary: Optional[str] = None
    tags: List[str]
    is_favorite: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HuntListResponse(BaseModel):
    items: List[HuntResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.post("/", response_model=HuntResponse, status_code=status.HTTP_201_CREATED)
async def create_hunt(
    hunt_data: HuntCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Opprett ny jakttur."""
    # Hent hunder
    dogs = []
    if hunt_data.dog_ids:
        dogs = (
            db.query(Dog)
            .filter(Dog.id.in_(hunt_data.dog_ids), Dog.user_id == current_user.id)
            .all()
        )

    # Opprett jakttur
    new_hunt = Hunt(
        user_id=current_user.id,
        title=hunt_data.title,
        date=hunt_data.date,
        start_time=hunt_data.start_time,
        end_time=hunt_data.end_time,
        location=hunt_data.location.dict(),
        weather=hunt_data.weather.dict() if hunt_data.weather else None,
        game_type=hunt_data.game_type,
        game_seen=[g.dict() for g in hunt_data.game_seen],
        game_harvested=[g.dict() for g in hunt_data.game_harvested],
        notes=hunt_data.notes,
        summary=hunt_data.summary,
        tags=hunt_data.tags,
        is_favorite=hunt_data.is_favorite,
    )
    new_hunt.dogs = dogs

    db.add(new_hunt)
    db.commit()
    db.refresh(new_hunt)

    return _hunt_to_response(new_hunt)


@router.get("/", response_model=HuntListResponse)
async def list_hunts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    game_types: Optional[str] = None,
    tags: Optional[str] = None,
    is_favorite: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Hent liste over jaktturer med filtrering og paginering."""
    query = db.query(Hunt).filter(Hunt.user_id == current_user.id)

    # Filtrer etter dato
    if date_from:
        query = query.filter(Hunt.date >= date_from)
    if date_to:
        query = query.filter(Hunt.date <= date_to)

    # Filtrer etter vilttyper
    if game_types:
        types = game_types.split(",")
        query = query.filter(Hunt.game_type.overlap(types))

    # Filtrer etter tagger
    if tags:
        tag_list = tags.split(",")
        query = query.filter(Hunt.tags.overlap(tag_list))

    # Filtrer etter favoritter
    if is_favorite is not None:
        query = query.filter(Hunt.is_favorite == is_favorite)

    # Søk i tittel og notater
    if search:
        query = query.filter(
            Hunt.title.ilike(f"%{search}%") | Hunt.notes.ilike(f"%{search}%")
        )

    # Tell totalt antall
    total = query.count()

    # Sorter og paginer
    hunts = (
        query.order_by(Hunt.date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    total_pages = (total + page_size - 1) // page_size

    return {
        "items": [_hunt_to_response(h) for h in hunts],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/{hunt_id}", response_model=HuntResponse)
async def get_hunt(
    hunt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Hent en spesifikk jakttur."""
    hunt = (
        db.query(Hunt)
        .filter(Hunt.id == hunt_id, Hunt.user_id == current_user.id)
        .first()
    )
    if not hunt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Jakttur ikke funnet"
        )

    return _hunt_to_response(hunt)


@router.put("/{hunt_id}", response_model=HuntResponse)
async def update_hunt(
    hunt_id: str,
    hunt_data: HuntUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Oppdater en jakttur."""
    hunt = (
        db.query(Hunt)
        .filter(Hunt.id == hunt_id, Hunt.user_id == current_user.id)
        .first()
    )
    if not hunt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Jakttur ikke funnet"
        )

    # Oppdater felt
    update_data = hunt_data.dict(exclude_unset=True)

    if "location" in update_data and update_data["location"]:
        update_data["location"] = hunt_data.location.dict()

    if "weather" in update_data and update_data["weather"]:
        update_data["weather"] = hunt_data.weather.dict()

    if "game_seen" in update_data:
        update_data["game_seen"] = [g.dict() for g in hunt_data.game_seen]

    if "game_harvested" in update_data:
        update_data["game_harvested"] = [g.dict() for g in hunt_data.game_harvested]

    if "dog_ids" in update_data:
        dogs = (
            db.query(Dog)
            .filter(Dog.id.in_(update_data["dog_ids"]), Dog.user_id == current_user.id)
            .all()
        )
        hunt.dogs = dogs
        del update_data["dog_ids"]

    for key, value in update_data.items():
        if value is not None:
            setattr(hunt, key, value)

    db.commit()
    db.refresh(hunt)

    return _hunt_to_response(hunt)


@router.delete("/{hunt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_hunt(
    hunt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Slett en jakttur."""
    hunt = (
        db.query(Hunt)
        .filter(Hunt.id == hunt_id, Hunt.user_id == current_user.id)
        .first()
    )
    if not hunt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Jakttur ikke funnet"
        )

    db.delete(hunt)
    db.commit()


@router.post("/{hunt_id}/favorite")
async def toggle_favorite(
    hunt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Veksle favorittmarkering for en jakttur."""
    hunt = (
        db.query(Hunt)
        .filter(Hunt.id == hunt_id, Hunt.user_id == current_user.id)
        .first()
    )
    if not hunt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Jakttur ikke funnet"
        )

    hunt.is_favorite = not hunt.is_favorite
    db.commit()

    return {"is_favorite": hunt.is_favorite}


def _hunt_to_response(hunt: Hunt) -> HuntResponse:
    """Konverter Hunt-modell til response-objekt."""
    return HuntResponse(
        id=str(hunt.id),
        user_id=str(hunt.user_id),
        title=hunt.title,
        date=hunt.date,
        start_time=hunt.start_time,
        end_time=hunt.end_time,
        location=hunt.location,
        weather=hunt.weather,
        game_type=hunt.game_type or [],
        game_seen=hunt.game_seen or [],
        game_harvested=hunt.game_harvested or [],
        dogs=[
            {
                "id": str(d.id),
                "name": d.name,
                "breed": d.breed,
                "color": d.color,
                "photo_url": d.photo_url,
            }
            for d in hunt.dogs
        ],
        tracks=[
            {
                "id": str(t.id),
                "name": t.name,
                "color": t.color,
                "statistics": t.statistics,
                "geojson": t.geojson,
            }
            for t in hunt.tracks
        ],
        photos=[
            {
                "id": str(p.id),
                "url": p.url,
                "thumbnail_url": p.thumbnail_url,
                "caption": p.caption,
            }
            for p in hunt.photos
        ],
        notes=hunt.notes,
        summary=hunt.summary,
        tags=hunt.tags or [],
        is_favorite=hunt.is_favorite,
        created_at=hunt.created_at,
        updated_at=hunt.updated_at,
    )
