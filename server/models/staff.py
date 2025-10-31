from sqlalchemy import Column, String, Boolean, DateTime, Text, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class Staff(Base):
    __tablename__ = "staff"
    
    staff_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.school_id"), nullable=False, index=True)
    staff_profile = Column(String(500))
    staff_name = Column(String(255), nullable=False)
    staff_dob = Column(Date)
    staff_gender = Column(String(10))
    staff_nid_photo = Column(String(500))
    staff_title = Column(String(100))
    staff_role = Column(String(100))
    employment_type = Column(String(50))
    qualifications = Column(Text)
    experience = Column(Text)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    school = relationship("School", back_populates="staff")
    
    def to_dict(self):
        return {
            "staff_id": str(self.staff_id),
            "school_id": str(self.school_id),
            "staff_profile": self.staff_profile,
            "staff_name": self.staff_name,
            "staff_dob": self.staff_dob.isoformat() if self.staff_dob else None,
            "staff_gender": self.staff_gender,
            "staff_nid_photo": self.staff_nid_photo,
            "staff_title": self.staff_title,
            "staff_role": self.staff_role,
            "employment_type": self.employment_type,
            "qualifications": self.qualifications,
            "experience": self.experience,
            "email": self.email,
            "is_active": self.is_active,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
