from sqlalchemy import Column, String, Boolean, DateTime, Date, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class Inventory(Base):
    __tablename__ = "inventory_management"
    
    inv_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.school_id"), nullable=False)
    inv_name = Column(String(255), nullable=False)
    inv_service = Column(String(255))
    inv_desc = Column(Text)
    inv_date = Column(Date)
    inv_price = Column(Float)
    inv_status = Column(String(50))
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self):
        return {
            "inv_id": str(self.inv_id),
            "school_id": str(self.school_id),
            "inv_name": self.inv_name,
            "inv_service": self.inv_service,
            "inv_desc": self.inv_desc,
            "inv_date": self.inv_date.isoformat() if self.inv_date else None,
            "inv_price": self.inv_price,
            "inv_status": self.inv_status,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
