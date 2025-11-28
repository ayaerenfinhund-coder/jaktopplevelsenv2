from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime

# Garmin schemas
class GarminCredentials(BaseModel):
    email: str
    password: str

class GarminActivity(BaseModel):
    activityId: int
    activityName: str
    startTimeLocal: str
    distance: float
    duration: float
    averageSpeed: float
    maxSpeed: float
    dog_id: Optional[str] = None

# Track schemas
class TrackCreate(BaseModel):
    name: str
    garmin_activity_id: Optional[int] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    distance_km: float
    duration_minutes: float
    geojson: dict
    statistics: dict
    dog_id: str

# Dog schemas
class DogBase(BaseModel):
    name: str
    breed: str
    birth_date: Optional[str] = None
    color: str
    garmin_device_id: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True

class DogCreate(DogBase):
    pass

class Dog(DogBase):
    id: str
    owner_id: str
    
    class Config:
        from_attributes = True

# Hunt schemas
class HuntBase(BaseModel):
    title: str
    date: str
    start_time: str
    end_time: str
    location: dict
    weather: Optional[dict] = None
    game_type: List[str] = []
    game_seen: List[dict] = []
    game_harvested: List[dict] = []
    notes: Optional[str] = None
    tags: List[str] = []
    is_favorite: bool = False

class HuntCreate(HuntBase):
    dogs: List[str]
    tracks: List[str]
    photos: List[str]

class Hunt(HuntBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    is_active: bool
    
    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
