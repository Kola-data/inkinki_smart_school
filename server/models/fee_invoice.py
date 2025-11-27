from sqlalchemy import Column, String, Boolean, DateTime, Float, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class FeeInvoice(Base):
    __tablename__ = "fee_invoices"
    
    invoice_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    fee_id = Column(UUID(as_uuid=True), ForeignKey("fee_management.fee_id"), nullable=False, index=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.school_id"), nullable=False, index=True)
    amount = Column(Float, nullable=False, default=0.0)
    invoice_img = Column(String(500))  # URL or path to invoice image
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    fee_management = relationship("FeeManagement", backref="invoices")
    school = relationship("School", backref="fee_invoices")
    
    # Index on fee_id for faster lookups
    __table_args__ = (
        Index('idx_fee_invoice_fee_id', 'fee_id'),
        Index('idx_fee_invoice_school_id', 'school_id'),
    )
    
    def to_dict(self):
        return {
            "invoice_id": str(self.invoice_id),
            "fee_id": str(self.fee_id),
            "school_id": str(self.school_id),
            "amount": self.amount,
            "invoice_img": self.invoice_img,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }



