from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class FeeType(Base):
    __tablename__ = "fee_types"
    
    fee_type_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.school_id"), nullable=False, index=True)
    fee_type_name = Column(String(255), nullable=False)
    description = Column(Text)
    amount_to_pay = Column(Float, nullable=False, default=0.0)
    is_active = Column(String(10), default="true")  # Using string as specified
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    school = relationship("School", backref="fee_types")
    
    def to_dict(self):
        return {
            "fee_type_id": str(self.fee_type_id),
            "school_id": str(self.school_id),
            "fee_type_name": self.fee_type_name,
            "description": self.description,
            "amount_to_pay": self.amount_to_pay,
            "is_active": self.is_active,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
