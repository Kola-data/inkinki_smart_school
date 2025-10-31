from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class Student(Base):
    __tablename__ = "students"
    
    std_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.school_id"), nullable=False)
    par_id = Column(UUID(as_uuid=True), ForeignKey("parents.par_id"), nullable=False)
    std_code = Column(String(255), nullable=True, unique=True, index=True)
    std_name = Column(String(255), nullable=False)
    std_dob = Column(String(20))  # Using string as specified
    std_gender = Column(String(10))
    previous_school = Column(String(255))
    started_class = Column(UUID(as_uuid=True), ForeignKey("classes.cls_id"))
    current_class = Column(UUID(as_uuid=True), ForeignKey("classes.cls_id"))
    status = Column(String(50))
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    school = relationship("School", backref="students")
    parent = relationship("Parent", backref="students")
    started_class_obj = relationship("Class", foreign_keys=[started_class], backref="started_students")
    current_class_obj = relationship("Class", foreign_keys=[current_class], backref="current_students")
    
    def to_dict(self, include_parent=False, include_classes=False):
        """Convert student to dict with optional joins"""
        result = {
            "std_id": str(self.std_id),
            "school_id": str(self.school_id),
            "par_id": str(self.par_id),
            "std_code": self.std_code,
            "std_name": self.std_name,
            "std_dob": self.std_dob,
            "std_gender": self.std_gender,
            "previous_school": self.previous_school,
            "started_class": str(self.started_class) if self.started_class else None,
            "current_class": str(self.current_class) if self.current_class else None,
            "status": self.status,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        
        # Include parent details if requested
        if include_parent and hasattr(self, 'parent') and self.parent:
            result["parent"] = {
                "par_id": str(self.parent.par_id),
                "mother_name": self.parent.mother_name,
                "father_name": self.parent.father_name,
                "mother_phone": self.parent.mother_phone,
                "father_phone": self.parent.father_phone,
                "mother_email": self.parent.mother_email,
                "father_email": self.parent.father_email,
                "par_address": self.parent.par_address,
                "par_type": self.parent.par_type
            }
        
        # Include class names if requested
        if include_classes:
            if self.started_class_obj:
                result["started_class_name"] = self.started_class_obj.cls_name
            if self.current_class_obj:
                result["current_class_name"] = self.current_class_obj.cls_name
        
        return result
