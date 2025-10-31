from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class School(Base):
    __tablename__ = "schools"
    
    school_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_name = Column(String(255), nullable=False)
    school_address = Column(Text)
    school_ownership = Column(String(100))
    school_phone = Column(String(20))
    school_email = Column(String(255))
    school_logo = Column(String(500))
    is_active = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    staff = relationship("Staff", back_populates="school")
    
    def to_dict(self):
        return {
            "school_id": str(self.school_id),
            "school_name": self.school_name,
            "school_address": self.school_address,
            "school_ownership": self.school_ownership,
            "school_phone": self.school_phone,
            "school_email": self.school_email,
            "school_logo": self.school_logo,
            "is_active": self.is_active,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
