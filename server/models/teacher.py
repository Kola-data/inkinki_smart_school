from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class Teacher(Base):
    __tablename__ = "teachers"
    
    teacher_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.staff_id"), nullable=False, unique=True, index=True)
    specialized = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    staff = relationship("Staff", backref="teacher")
    
    def to_dict(self):
        return {
            "teacher_id": str(self.teacher_id),
            "staff_id": str(self.staff_id),
            "specialized": self.specialized,
            "is_active": self.is_active,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
