from sqlalchemy import Column, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class ExamMark(Base):
    __tablename__ = "exam_marks"
    
    exam_mark_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.school_id"), nullable=False)
    std_id = Column(UUID(as_uuid=True), ForeignKey("students.std_id"), nullable=False)
    subj_id = Column(UUID(as_uuid=True), ForeignKey("subjects.subj_id"), nullable=False)
    cls_id = Column(UUID(as_uuid=True), ForeignKey("classes.cls_id"), nullable=False)
    academic_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.academic_id"), nullable=False)
    term = Column(String(50), nullable=False)
    exam_avg_mark = Column(Float)
    exam_mark = Column(Float)
    status = Column(String(50))
    is_published = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    school = relationship("School", backref="exam_marks")
    student = relationship("Student", backref="exam_marks")
    subject = relationship("Subject", backref="exam_marks")
    class_obj = relationship("Class", backref="exam_marks")
    academic_year = relationship("AcademicYear", backref="exam_marks")
    
    def to_dict(self):
        return {
            "exam_mark_id": str(self.exam_mark_id),
            "school_id": str(self.school_id),
            "std_id": str(self.std_id),
            "subj_id": str(self.subj_id),
            "cls_id": str(self.cls_id),
            "academic_id": str(self.academic_id),
            "term": self.term,
            "exam_avg_mark": self.exam_avg_mark,
            "exam_mark": self.exam_mark,
            "status": self.status,
            "is_published": self.is_published,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
