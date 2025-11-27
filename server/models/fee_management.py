from sqlalchemy import Column, String, Boolean, DateTime, Float, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class FeeManagement(Base):
    __tablename__ = "fee_management"
    
    fee_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.school_id"), nullable=False, index=True)
    std_id = Column(UUID(as_uuid=True), ForeignKey("students.std_id"), nullable=False, index=True)
    fee_type_id = Column(UUID(as_uuid=True), ForeignKey("fee_types.fee_type_id"), nullable=False, index=True)
    academic_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.academic_id"), nullable=False, index=True)
    term = Column(String(50), nullable=False)
    amount_paid = Column(Float, nullable=False, default=0.0)
    status = Column(String(50), nullable=False, default="pending")
    invoice_img = Column(String(500))  # URL or path to invoice image
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    school = relationship("School", backref="fee_management")
    student = relationship("Student", backref="fee_management")
    fee_type = relationship("FeeType", backref="fee_management")
    academic_year = relationship("AcademicYear", backref="fee_management")
    
    # Index on term as specified
    __table_args__ = (
        Index('idx_fee_management_term', 'term'),
    )
    
    def to_dict(self):
        return {
            "fee_id": str(self.fee_id),
            "school_id": str(self.school_id),
            "std_id": str(self.std_id),
            "fee_type_id": str(self.fee_type_id),
            "academic_id": str(self.academic_id),
            "term": self.term,
            "amount_paid": self.amount_paid,
            "status": self.status,
            "invoice_img": self.invoice_img,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
