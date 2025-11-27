from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class Parent(Base):
    __tablename__ = "parents"
    
    par_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.school_id"), nullable=False, index=True)
    mother_name = Column(String(255))
    father_name = Column(String(255))
    mother_phone = Column(String(20))
    father_phone = Column(String(20))
    mother_email = Column(String(255))
    father_email = Column(String(255))
    par_address = Column(Text)
    par_type = Column(String(50))
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    school = relationship("School", backref="parents")
    
    def to_dict(self):
        return {
            "par_id": str(self.par_id),
            "school_id": str(self.school_id),
            "mother_name": self.mother_name,
            "father_name": self.father_name,
            "mother_phone": self.mother_phone,
            "father_phone": self.father_phone,
            "mother_email": self.mother_email,
            "father_email": self.father_email,
            "par_address": self.par_address,
            "par_type": self.par_type,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
