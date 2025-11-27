from sqlalchemy import Column, String, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class SchoolPaymentRecord(Base):
    __tablename__ = "school_payment_records"
    
    record_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.school_id"), nullable=False, index=True)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payment_seasons.pay_id"), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending")  # e.g., pending, paid, overdue, cancelled
    date = Column(Date, nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    school = relationship("School", backref="payment_records")
    payment_season = relationship("PaymentSeason", backref="school_records")
    
    def to_dict(self):
        return {
            "record_id": str(self.record_id),
            "school_id": str(self.school_id),
            "payment_id": str(self.payment_id),
            "status": self.status,
            "date": self.date.isoformat() if self.date else None,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


