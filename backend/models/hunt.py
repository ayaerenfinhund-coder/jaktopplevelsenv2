from sqlalchemy import (
    Column,
    String,
    DateTime,
    Date,
    Time,
    Boolean,
    ForeignKey,
    Text,
    JSON,
    Table,
)
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .base import Base


# Association table for many-to-many relationship
HuntDog = Table(
    "hunt_dogs",
    Base.metadata,
    Column(
        "hunt_id",
        String,
        ForeignKey("hunts.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "dog_id",
        String,
        ForeignKey("dogs.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Hunt(Base):
    __tablename__ = "hunts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(255), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=True)
    location = Column(JSON, nullable=False)
    weather = Column(JSON, nullable=True)
    game_type = Column(JSON, default=[]) # SQLite doesn't support ARRAY
    game_seen = Column(JSON, default=[])
    game_harvested = Column(JSON, default=[])
    notes = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    tags = Column(JSON, default=[]) # SQLite doesn't support ARRAY
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="hunts")
    dogs = relationship("Dog", secondary=HuntDog, back_populates="hunts")
    tracks = relationship("Track", back_populates="hunt", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="hunt", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Hunt {self.title} on {self.date}>"
