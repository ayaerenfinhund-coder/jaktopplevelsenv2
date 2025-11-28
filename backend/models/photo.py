from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, JSON
from datetime import datetime
import uuid
from .base import Base
from sqlalchemy.orm import relationship


class Photo(Base):
    __tablename__ = "photos"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    hunt_id = Column(
        String, ForeignKey("hunts.id", ondelete="CASCADE"), nullable=False
    )
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(50), nullable=False)
    url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=False)
    caption = Column(Text, nullable=True)
    taken_at = Column(DateTime(timezone=True), nullable=True)
    location = Column(JSON, nullable=True)
    exif_data = Column(JSON, nullable=True)
    tags = Column(JSON, default=[])
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    hunt = relationship("Hunt", back_populates="photos")

    def __repr__(self):
        return f"<Photo {self.filename}>"
