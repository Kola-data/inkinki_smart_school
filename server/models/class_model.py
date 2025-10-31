from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class Class(Base):
    __tablename__ = "classes"
    
    cls_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    cls_name = Column(String(255), nullable=False)
    cls_type = Column(String(100), nullable=False)
    cls_manager = Column(UUID(as_uuid=True), ForeignKey("teachers.teacher_id"), nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    manager = relationship("Teacher", backref="managed_classes")
    class_teachers = relationship("ClassTeacher", back_populates="class_obj")
    
    def to_dict(self):
        return {
            "cls_id": str(self.cls_id),
            "cls_name": self.cls_name,
            "cls_type": self.cls_type,
            "cls_manager": str(self.cls_manager),
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }