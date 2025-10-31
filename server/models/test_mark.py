from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class TestMark(Base):
    __tablename__ = "test_marks"
    
    test_mark_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.school_id"), nullable=False)
    std_id = Column(UUID(as_uuid=True), ForeignKey("students.std_id"), nullable=False)
    subj_id = Column(UUID(as_uuid=True), ForeignKey("subjects.subj_id"), nullable=False)
    cls_id = Column(UUID(as_uuid=True), ForeignKey("classes.cls_id"), nullable=False)
    academic_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.academic_id"), nullable=False)
    term = Column(String(50), nullable=False)
    test_avg_mark = Column(Float, nullable=True)
    test_mark = Column(Float, nullable=False)
    status = Column(String(50), nullable=True)
    is_published = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    school = relationship("School", backref="test_marks")
    student = relationship("Student", backref="test_marks")
    subject = relationship("Subject", backref="test_marks")
    class_obj = relationship("Class", backref="test_marks")
    academic_year = relationship("AcademicYear", backref="test_marks")
    
    def to_dict(self):
        return {
            "test_mark_id": str(self.test_mark_id),
            "school_id": str(self.school_id),
            "std_id": str(self.std_id),
            "subj_id": str(self.subj_id),
            "cls_id": str(self.cls_id),
            "academic_id": str(self.academic_id),
            "term": self.term,
            "test_avg_mark": self.test_avg_mark,
            "test_mark": self.test_mark,
            "status": self.status,
            "is_published": self.is_published,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

