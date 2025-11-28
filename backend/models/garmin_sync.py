from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from datetime import datetime
import uuid
from .base import Base
from sqlalchemy.orm import relationship


class GarminSyncLog(Base):
    __tablename__ = "garmin_sync_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    sync_started_at = Column(DateTime(timezone=True), nullable=False)
    sync_completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), nullable=False)  # in_progress, completed, failed
    tracks_imported = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="garmin_sync_logs")

    def __repr__(self):
        return f"<GarminSyncLog {self.status} at {self.sync_started_at}>"
