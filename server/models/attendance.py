from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class Attendance(Base):
    __tablename__ = "students_attendance"
    
    att_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.school_id"), nullable=False, index=True)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.teacher_id"), nullable=False, index=True)
    std_id = Column(UUID(as_uuid=True), ForeignKey("students.std_id"), nullable=False, index=True)
    subj_id = Column(UUID(as_uuid=True), ForeignKey("subjects.subj_id"), nullable=False, index=True)
    cls_id = Column(UUID(as_uuid=True), ForeignKey("classes.cls_id"), nullable=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False)  # date_hours as specified
    status = Column(String(50))
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    school = relationship("School", backref="attendance_records")
    teacher = relationship("Teacher", backref="attendance_records")
    student = relationship("Student", backref="attendance_records")
    subject = relationship("Subject", backref="attendance_records")
    class_obj = relationship("Class", backref="attendance_records")
    
    def to_dict(self):
        return {
            "att_id": str(self.att_id),
            "school_id": str(self.school_id),
            "teacher_id": str(self.teacher_id),
            "std_id": str(self.std_id),
            "subj_id": str(self.subj_id),
            "cls_id": str(self.cls_id) if self.cls_id else None,
            "date": self.date.isoformat() if self.date else None,
            "status": self.status,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
