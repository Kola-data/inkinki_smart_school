from sqlalchemy import Column, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class ClassTeacher(Base):
    __tablename__ = "class_teachers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.teacher_id"), nullable=False, index=True)
    subj_id = Column(UUID(as_uuid=True), ForeignKey("subjects.subj_id"), nullable=False, index=True)
    cls_id = Column(UUID(as_uuid=True), ForeignKey("classes.cls_id"), nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    teacher = relationship("Teacher", backref="class_assignments")
    subject = relationship("Subject", backref="class_assignments")
    class_obj = relationship("Class", back_populates="class_teachers")
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "teacher_id": str(self.teacher_id),
            "subj_id": str(self.subj_id),
            "cls_id": str(self.cls_id),
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }