from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

class LoginRequest(BaseModel):
    """Schema for login request"""
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    """Schema for login response"""
    access_token: str
    token_type: str = "bearer"
    staff_id: UUID
    staff_name: str
    staff_title: str
    staff_role: str
    school_id: UUID
    email: str

class ResetPasswordRequest(BaseModel):
    """Schema for password reset request"""
    email: EmailStr

class ResetPasswordConfirm(BaseModel):
    """Schema for password reset confirmation"""
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    """Schema for changing password (when logged in)"""
    current_password: str
    new_password: str

class TokenData(BaseModel):
    """Schema for token data"""
    staff_id: Optional[UUID] = None
    email: Optional[str] = None
    school_id: Optional[UUID] = None
