from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from database import Base

class UserRole(str, enum.Enum):
    """System user roles"""
    SUPER_ADMIN = "super-admin"
    FINANCE_ADMIN = "finance-admin"
    ACADEMIC_ADMIN = "academic-admin"

class AccountStatus(str, enum.Enum):
    """Account status options"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"

class SystemUser(Base):
    __tablename__ = "system_users"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Core Identity Info
    full_name = Column(String(255), nullable=False)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), nullable=True)
    profile_image = Column(String(500), nullable=True)  # URL or file path
    
    # Authentication & Security
    password = Column(String(255), nullable=False)  # Hashed password
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.ACADEMIC_ADMIN)
    last_login = Column(DateTime(timezone=True), nullable=True)
    account_status = Column(SQLEnum(AccountStatus), nullable=False, default=AccountStatus.ACTIVE)
    
    # System Tracking / Auditing
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("system_users.user_id"), nullable=True)
    device_ip_logs = Column(JSON, nullable=True)  # Stores device and IP tracking data
    
    # Relationships
    creator = relationship("SystemUser", remote_side=[user_id], backref="created_users")
    
    def to_dict(self):
        return {
            "user_id": str(self.user_id),
            "full_name": self.full_name,
            "username": self.username,
            "email": self.email,
            "phone_number": self.phone_number,
            "profile_image": self.profile_image,
            "role": self.role.value if self.role else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "account_status": self.account_status.value if self.account_status else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by": str(self.created_by) if self.created_by else None,
            "device_ip_logs": self.device_ip_logs
        }

