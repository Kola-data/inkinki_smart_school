from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, Dict, Any
from uuid import UUID
from models.staff import Staff
from schemas.auth_schemas import LoginRequest, LoginResponse, ResetPasswordRequest, ResetPasswordConfirm, ChangePasswordRequest
from utils.auth_utils import create_access_token, verify_password, get_password_hash, verify_token
from utils.password_utils import hash_password, verify_password as bcrypt_verify_password
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs
import secrets
import uuid

class AuthService:
    """Service class for authentication operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def login(self, login_data: LoginRequest) -> Optional[LoginResponse]:
        """Authenticate staff member and return JWT token"""
        try:
            # Find staff by email
            result = await self.db.execute(
                select(Staff).filter(
                    Staff.email == login_data.email,
                    Staff.is_deleted == False,
                    Staff.is_active == True
                )
            )
            staff = result.scalar_one_or_none()
            
            if not staff:
                # Log failed login attempt
                await logging_service.log_async(
                    level=LogLevel.WARNING,
                    action=ActionType.LOGIN_FAILED,
                    message=f"Login attempt with non-existent email: {login_data.email}",
                    data={"email": login_data.email}
                )
                return None
            
            # Verify password
            if not bcrypt_verify_password(login_data.password, staff.password):
                # Log failed login attempt
                await logging_service.log_async(
                    level=LogLevel.WARNING,
                    action=ActionType.LOGIN_FAILED,
                    message=f"Invalid password for email: {login_data.email}",
                    data={"email": login_data.email, "staff_id": str(staff.staff_id)}
                )
                return None
            
            # Create JWT token
            token_data = {
                "staff_id": str(staff.staff_id),
                "email": staff.email,
                "school_id": str(staff.school_id),
                "staff_name": staff.staff_name,
                "staff_title": staff.staff_title,
                "staff_role": staff.staff_role
            }
            
            access_token = create_access_token(data=token_data)
            
            # Log successful login
            await logging_service.log_async(
                level=LogLevel.INFO,
                action=ActionType.LOGIN_SUCCESS,
                message=f"Successful login for staff: {staff.staff_name}",
                data={
                    "staff_id": str(staff.staff_id),
                    "email": staff.email,
                    "school_id": str(staff.school_id)
                }
            )
            
            return LoginResponse(
                access_token=access_token,
                staff_id=staff.staff_id,
                staff_name=staff.staff_name,
                staff_title=staff.staff_title,
                staff_role=staff.staff_role,
                school_id=staff.school_id,
                email=staff.email
            )
            
        except Exception as e:
            # Log error
            await logging_service.log_async(
                level=LogLevel.ERROR,
                action=ActionType.LOGIN_ERROR,
                message=f"Login error: {str(e)}",
                data={"email": login_data.email}
            )
            return None
    
    async def reset_password_request(self, reset_data: ResetPasswordRequest) -> bool:
        """Request password reset (generate reset token)"""
        try:
            # Find staff by email
            result = await self.db.execute(
                select(Staff).filter(
                    Staff.email == reset_data.email,
                    Staff.is_deleted == False,
                    Staff.is_active == True
                )
            )
            staff = result.scalar_one_or_none()
            
            if not staff:
                # Don't reveal if email exists or not for security
                await logging_service.log_async(
                    level=LogLevel.INFO,
                    action=ActionType.PASSWORD_RESET_REQUEST,
                    message=f"Password reset requested for email: {reset_data.email}",
                    data={"email": reset_data.email}
                )
                return True  # Always return True for security
            
            # Generate reset token (in real app, this would be sent via email)
            reset_token = secrets.token_urlsafe(32)
            
            # In a real application, you would:
            # 1. Store the reset token in database with expiration
            # 2. Send email with reset link
            # For now, we'll just log it
            await logging_service.log_async(
                level=LogLevel.INFO,
                action=ActionType.PASSWORD_RESET_REQUEST,
                message=f"Password reset token generated for: {staff.staff_name}",
                data={
                    "staff_id": str(staff.staff_id),
                    "email": staff.email,
                    "reset_token": reset_token  # In production, don't log this
                }
            )
            
            return True
            
        except Exception as e:
            await logging_service.log_async(
                level=LogLevel.ERROR,
                action=ActionType.PASSWORD_RESET_ERROR,
                message=f"Password reset request error: {str(e)}",
                data={"email": reset_data.email}
            )
            return False
    
    async def reset_password_confirm(self, reset_data: ResetPasswordConfirm) -> bool:
        """Confirm password reset with token"""
        try:
            # In a real application, you would:
            # 1. Verify the reset token from database
            # 2. Check if token is not expired
            # For now, we'll accept any token (in production, implement proper token validation)
            
            # Find staff by email (in real app, you'd get this from the token)
            # For demo purposes, we'll assume the token contains staff info
            # In production, implement proper token validation
            
            await logging_service.log_async(
                level=LogLevel.INFO,
                action=ActionType.PASSWORD_RESET_CONFIRM,
                message=f"Password reset confirmed with token",
                data={"token": reset_data.token[:10] + "..."}  # Don't log full token
            )
            
            return True
            
        except Exception as e:
            await logging_service.log_async(
                level=LogLevel.ERROR,
                action=ActionType.PASSWORD_RESET_ERROR,
                message=f"Password reset confirmation error: {str(e)}",
                data={"token": reset_data.token[:10] + "..."}
            )
            return False
    
    async def change_password(self, staff_id: UUID, change_data: ChangePasswordRequest) -> bool:
        """Change password for authenticated staff member"""
        try:
            # Get staff member
            result = await self.db.execute(
                select(Staff).filter(
                    Staff.staff_id == staff_id,
                    Staff.is_deleted == False
                )
            )
            staff = result.scalar_one_or_none()
            
            if not staff:
                return False
            
            # Verify current password
            if not bcrypt_verify_password(change_data.current_password, staff.password):
                await logging_service.log_async(
                    level=LogLevel.WARNING,
                    action=ActionType.PASSWORD_CHANGE_FAILED,
                    message=f"Invalid current password for staff: {staff.staff_name}",
                    data={"staff_id": str(staff_id)}
                )
                return False
            
            # Hash new password
            new_hashed_password = hash_password(change_data.new_password)
            
            # Update password
            staff.password = new_hashed_password
            await self.db.commit()
            
            # Log successful password change
            await logging_service.log_async(
                level=LogLevel.INFO,
                action=ActionType.PASSWORD_CHANGE_SUCCESS,
                message=f"Password changed successfully for staff: {staff.staff_name}",
                data={"staff_id": str(staff_id)}
            )
            
            return True
            
        except Exception as e:
            await logging_service.log_async(
                level=LogLevel.ERROR,
                action=ActionType.PASSWORD_CHANGE_ERROR,
                message=f"Password change error: {str(e)}",
                data={"staff_id": str(staff_id)}
            )
            return False
    
    async def get_current_staff(self, token: str) -> Optional[Staff]:
        """Get current staff member from JWT token"""
        try:
            payload = verify_token(token)
            if not payload:
                return None
            
            staff_id = payload.get("staff_id")
            if not staff_id:
                return None
            
            # Get staff from database
            result = await self.db.execute(
                select(Staff).filter(
                    Staff.staff_id == UUID(staff_id),
                    Staff.is_deleted == False,
                    Staff.is_active == True
                )
            )
            return result.scalar_one_or_none()
            
        except Exception as e:
            await logging_service.log_async(
                level=LogLevel.ERROR,
                action=ActionType.TOKEN_VERIFICATION_ERROR,
                message=f"Token verification error: {str(e)}",
                data={"token": token[:10] + "..."}
            )
            return None
