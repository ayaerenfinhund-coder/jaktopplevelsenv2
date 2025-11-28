from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    avatar_url = Column(String, nullable=True)
    settings = Column(
        JSON,
        default={
            "theme": "dark",
            "language": "no",
            "units": "metric",
            "map_style": "terrain",
            "auto_sync_garmin": False,
            "notification_preferences": {
                "email_summary": True,
                "new_track_imported": True,
                "backup_reminder": True,
            },
        },
    )
    garmin_credentials = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    dogs = relationship("Dog", back_populates="user", cascade="all, delete-orphan")
    hunts = relationship("Hunt", back_populates="user", cascade="all, delete-orphan")
    garmin_sync_logs = relationship(
        "GarminSyncLog", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User {self.email}>"
