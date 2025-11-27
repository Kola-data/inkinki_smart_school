from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Dict, Any, Union
from datetime import datetime
from uuid import UUID
from enum import Enum

class UserRole(str, Enum):
    """System user roles"""
    SUPER_ADMIN = "super-admin"
    FINANCE_ADMIN = "finance-admin"
    ACADEMIC_ADMIN = "academic-admin"

class AccountStatus(str, Enum):
    """Account status options"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"

class SystemUserBase(BaseModel):
    """Base schema for SystemUser with common fields"""
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name of the system user")
    username: str = Field(..., min_length=3, max_length=100, description="Unique username for login")
    email: EmailStr = Field(..., description="Primary email address")
    phone_number: Optional[str] = Field(None, max_length=20, description="Phone number for 2FA or alerts")
    profile_image: Optional[str] = Field(None, max_length=500, description="URL or path to profile image")
    role: UserRole = Field(UserRole.ACADEMIC_ADMIN, description="User role")
    account_status: AccountStatus = Field(AccountStatus.ACTIVE, description="Account status")

class SystemUserCreate(SystemUserBase):
    """Schema for creating a new system user"""
    password: str = Field(..., min_length=8, description="Password (will be hashed)")

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class SystemUserUpdate(BaseModel):
    """Schema for updating a system user"""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    email: Optional[Union[EmailStr, str]] = None
    phone_number: Optional[str] = Field(None, max_length=20)
    profile_image: Optional[str] = Field(None, max_length=500)
    role: Optional[UserRole] = None
    account_status: Optional[AccountStatus] = None
    password: Optional[str] = Field(None, min_length=8, description="New password (will be hashed)")

    @validator('email', pre=True)
    def validate_email(cls, v):
        """Convert empty strings to None for email fields"""
        if v == '' or v is None:
            return None
        if isinstance(v, str) and v.strip() == '':
            return None
        return v

    @validator('password')
    def validate_password(cls, v):
        if v is not None and len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class SystemUserResponse(SystemUserBase):
    """Schema for system user response"""
    user_id: UUID
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    device_ip_logs: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class SystemUserStatusUpdate(BaseModel):
    """Schema for updating account status only"""
    account_status: AccountStatus

class SystemUserPasswordUpdate(BaseModel):
    """Schema for updating password only"""
    current_password: str
    new_password: str = Field(..., min_length=8)

    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class SystemUserLoginUpdate(BaseModel):
    """Schema for updating last login and device/IP logs"""
    device_info: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None

