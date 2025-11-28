from sqlalchemy import Column, String, DateTime, Date, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .base import Base


class Dog(Base):
    __tablename__ = "dogs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(100), nullable=False)
    breed = Column(String(100), nullable=False)
    birth_date = Column(Date, nullable=True)
    color = Column(String(7), nullable=False, default="#FF6B6B")
    garmin_collar_id = Column(String(100), nullable=True)
    photo_url = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="dogs")
    tracks = relationship("Track", back_populates="dog")
    hunts = relationship("Hunt", secondary="hunt_dogs", back_populates="dogs")

    def __repr__(self):
        return f"<Dog {self.name}>"
