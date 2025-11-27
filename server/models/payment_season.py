from sqlalchemy import Column, String, Boolean, DateTime, Date, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class PaymentSeason(Base):
    __tablename__ = "payment_seasons"
    
    pay_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    season_pay_name = Column(String(255), nullable=False)
    from_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    coupon_number = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="active")
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self):
        return {
            "pay_id": str(self.pay_id),
            "season_pay_name": self.season_pay_name,
            "from_date": self.from_date.isoformat() if self.from_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "amount": self.amount,
            "coupon_number": self.coupon_number,
            "status": self.status,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

