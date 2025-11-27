from sqlalchemy import Column, String, Boolean, DateTime, Date, Float, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class Expense(Base):
    __tablename__ = "expenses"
    
    expense_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.school_id"), nullable=False, index=True)
    academic_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.academic_id"), nullable=True, index=True)
    category = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50))  # CASH, BANK_TRANSFER, MOBILE_MONEY, CHEQUE, ONLINE_PAYMENT
    status = Column(String(50), nullable=False)  # PENDING, APPROVED, PAID, REJECTED, ARCHIVED
    expense_date = Column(Date, index=True)
    invoice_image = Column(JSON)  # Array of image URLs/paths
    added_by = Column(UUID(as_uuid=True), ForeignKey("staff.staff_id"), nullable=True, index=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("staff.staff_id"), nullable=True, index=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    school = relationship("School", backref="expenses")
    academic_year = relationship("AcademicYear", backref="expenses")
    added_by_staff = relationship("Staff", foreign_keys=[added_by], backref="expenses_added")
    approved_by_staff = relationship("Staff", foreign_keys=[approved_by], backref="expenses_approved")
    
    def to_dict(self):
        return {
            "expense_id": str(self.expense_id),
            "school_id": str(self.school_id),
            "academic_id": str(self.academic_id) if self.academic_id else None,
            "category": self.category,
            "title": self.title,
            "description": self.description,
            "amount": self.amount,
            "payment_method": self.payment_method,
            "status": self.status,
            "expense_date": self.expense_date.isoformat() if self.expense_date else None,
            "invoice_image": self.invoice_image,
            "added_by": str(self.added_by) if self.added_by else None,
            "approved_by": str(self.approved_by) if self.approved_by else None,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "academic_year": {
                "academic_id": str(self.academic_year.academic_id),
                "academic_name": self.academic_year.academic_name,
            } if self.academic_year else None
        }

