from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from datetime import datetime
import uuid
from .base import Base
from sqlalchemy.orm import relationship


class Track(Base):
    __tablename__ = "tracks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    hunt_id = Column(
        String, ForeignKey("hunts.id", ondelete="CASCADE"), nullable=False
    )
    dog_id = Column(
        String,
        ForeignKey("dogs.id", ondelete="SET NULL"),
        nullable=True,
    )
    name = Column(String(255), nullable=False)
    source = Column(String(50), nullable=False)  # garmin, gpx_import, manual
    gpx_data = Column(Text, nullable=True)
    geojson = Column(JSON, nullable=False)
    statistics = Column(JSON, nullable=False)
    color = Column(String(7), nullable=False, default="#4ECDC4")
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    hunt = relationship("Hunt", back_populates="tracks")
    dog = relationship("Dog", back_populates="tracks")

    def __repr__(self):
        return f"<Track {self.name}>"
