from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta, timezone
from models.staff import Staff
from models.school import School
from models.password_reset import PasswordReset
from schemas.auth_schemas import LoginRequest, LoginResponse, ResetPasswordRequest, ResetPasswordConfirm, ChangePasswordRequest
from utils.auth_utils import create_access_token, verify_password, get_password_hash, verify_token
from utils.password_utils import hash_password, verify_password as bcrypt_verify_password
from utils.email_service import EmailService
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs
import secrets
import uuid
import random

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
            
            # Check if staff is active and not deleted (already checked above, but double-check)
            if staff.is_deleted or not staff.is_active:
                # Log failed login attempt
                await logging_service.log_async(
                    level=LogLevel.WARNING,
                    action=ActionType.LOGIN_FAILED,
                    message=f"Login attempt for inactive or deleted staff: {login_data.email}",
                    data={
                        "email": login_data.email,
                        "staff_id": str(staff.staff_id),
                        "is_active": staff.is_active,
                        "is_deleted": staff.is_deleted
                    }
                )
                return None
            
            # Verify school is active and not deleted
            school_result = await self.db.execute(
                select(School).filter(
                    School.school_id == staff.school_id
                )
            )
            school = school_result.scalar_one_or_none()
            
            if not school:
                # Log failed login attempt
                await logging_service.log_async(
                    level=LogLevel.WARNING,
                    action=ActionType.LOGIN_FAILED,
                    message=f"Login attempt for staff with invalid school: {login_data.email}",
                    data={
                        "email": login_data.email,
                        "staff_id": str(staff.staff_id),
                        "school_id": str(staff.school_id)
                    }
                )
                return None
            
            if school.is_deleted:
                # Log failed login attempt
                await logging_service.log_async(
                    level=LogLevel.WARNING,
                    action=ActionType.LOGIN_FAILED,
                    message=f"Login attempt for staff in deleted school: {login_data.email}",
                    data={
                        "email": login_data.email,
                        "staff_id": str(staff.staff_id),
                        "school_id": str(staff.school_id)
                    }
                )
                return None
            
            if not school.is_active:
                # Log failed login attempt
                await logging_service.log_async(
                    level=LogLevel.WARNING,
                    action=ActionType.LOGIN_FAILED,
                    message=f"Login attempt for staff in inactive school: {login_data.email}",
                    data={
                        "email": login_data.email,
                        "staff_id": str(staff.staff_id),
                        "school_id": str(staff.school_id)
                    }
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
                staff_title=staff.staff_title or "",
                staff_role=staff.staff_role or "",
                school_id=staff.school_id,
                email=staff.email,
                staff_profile=staff.staff_profile
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
        """Request password reset (generate 6-digit verification code)"""
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
            
            # Always return True for security (don't reveal if email exists)
            # But only send email if staff exists
            if not staff:
                await logging_service.log_async(
                    level=LogLevel.INFO,
                    action=ActionType.PASSWORD_RESET_REQUEST,
                    message=f"Password reset requested for non-existent email: {reset_data.email}",
                    data={"email": reset_data.email}
                )
                return True  # Always return True for security
            
            # Generate 6-digit verification code
            verification_code = f"{random.randint(100000, 999999)}"
            
            # Set expiration to 15 minutes from now
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
            
            # Invalidate any existing unused codes for this email
            await self.db.execute(
                delete(PasswordReset).filter(
                    PasswordReset.email == reset_data.email,
                    PasswordReset.is_used == False
                )
            )
            
            # Create new password reset record
            password_reset = PasswordReset(
                email=reset_data.email,
                verification_code=verification_code,
                expires_at=expires_at,
                is_used=False
            )
            self.db.add(password_reset)
            await self.db.commit()
            
            # Send email with verification code (non-blocking - don't fail request if email fails)
            try:
                await logging_service.log_async(
                    level=LogLevel.INFO,
                    action=ActionType.PASSWORD_RESET_REQUEST,
                    message=f"Attempting to send password reset email to: {reset_data.email}",
                    data={"email": reset_data.email, "verification_code": verification_code}
                )
                
                email_sent = EmailService.send_password_reset_email(
                    to_email=reset_data.email,
                    verification_code=verification_code
                )
                
                if email_sent:
                    await logging_service.log_async(
                        level=LogLevel.INFO,
                        action=ActionType.PASSWORD_RESET_REQUEST,
                        message=f"✅ Password reset email sent successfully to: {reset_data.email}",
                        data={"email": reset_data.email}
                    )
                else:
                    await logging_service.log_async(
                        level=LogLevel.ERROR,
                        action=ActionType.PASSWORD_RESET_ERROR,
                        message=f"❌ Failed to send password reset email to: {reset_data.email}. Check SMTP configuration.",
                        data={"email": reset_data.email}
                    )
                    # Still return True for security (don't reveal if email exists)
                    # But log the error for debugging
            except Exception as email_error:
                await logging_service.log_async(
                    level=LogLevel.ERROR,
                    action=ActionType.PASSWORD_RESET_ERROR,
                    message=f"❌ Email service exception: {str(email_error)}",
                    data={"email": reset_data.email, "error": str(email_error)}
                )
                # Still return True for security
            
            # Log successful password reset request
            await logging_service.log_async(
                level=LogLevel.INFO,
                action=ActionType.PASSWORD_RESET_REQUEST,
                message=f"Password reset code sent to: {staff.staff_name}",
                data={
                    "staff_id": str(staff.staff_id),
                    "email": staff.email
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
        """Confirm password reset with verification code"""
        try:
            # Clean and normalize the verification code (remove whitespace)
            verification_code = reset_data.verification_code.strip()
            # Email comparison should be case-insensitive, but don't modify the original
            email = reset_data.email.strip()
            
            # Log the attempt
            await logging_service.log_async(
                level=LogLevel.INFO,
                action=ActionType.PASSWORD_RESET_CONFIRM,
                message=f"Attempting to verify code for email: {email}",
                data={"email": email, "code_length": len(verification_code), "code": verification_code}
            )
            
            # First, check if any unused codes exist for this email (case-insensitive)
            check_result = await self.db.execute(
                select(PasswordReset).filter(
                    func.lower(PasswordReset.email) == func.lower(email),
                    PasswordReset.is_used == False
                ).order_by(PasswordReset.created_at.desc())
            )
            all_codes = check_result.scalars().all()
            
            if all_codes:
                await logging_service.log_async(
                    level=LogLevel.INFO,
                    action=ActionType.PASSWORD_RESET_CONFIRM,
                    message=f"Found {len(all_codes)} unused code(s) for email: {email}",
                    data={"email": email, "codes": [c.verification_code for c in all_codes], "db_emails": [c.email for c in all_codes]}
                )
            
            # Find the password reset record (case-insensitive email comparison)
            result = await self.db.execute(
                select(PasswordReset).filter(
                    func.lower(PasswordReset.email) == func.lower(email),
                    PasswordReset.verification_code == verification_code,
                    PasswordReset.is_used == False
                )
            )
            password_reset = result.scalar_one_or_none()
            
            if not password_reset:
                await logging_service.log_async(
                    level=LogLevel.WARNING,
                    action=ActionType.PASSWORD_RESET_CONFIRM,
                    message=f"Invalid verification code for email: {email}. Code provided: '{verification_code}'",
                    data={"email": email, "code_provided": verification_code, "available_codes": [c.verification_code for c in all_codes] if all_codes else []}
                )
                return False
            
            # Check if code has expired
            from datetime import timezone
            current_time = datetime.now(timezone.utc)
            if current_time > password_reset.expires_at:
                await logging_service.log_async(
                    level=LogLevel.WARNING,
                    action=ActionType.PASSWORD_RESET_CONFIRM,
                    message=f"Expired verification code for email: {email}. Current: {current_time}, Expires: {password_reset.expires_at}",
                    data={"email": email, "current_time": str(current_time), "expires_at": str(password_reset.expires_at)}
                )
                return False
            
            # Find staff by email (case-insensitive)
            staff_result = await self.db.execute(
                select(Staff).filter(
                    func.lower(Staff.email) == func.lower(email),
                    Staff.is_deleted == False,
                    Staff.is_active == True
                )
            )
            staff = staff_result.scalar_one_or_none()
            
            if not staff:
                await logging_service.log_async(
                    level=LogLevel.WARNING,
                    action=ActionType.PASSWORD_RESET_CONFIRM,
                    message=f"Staff not found for email: {email}",
                    data={"email": email}
                )
                return False
            
            # Hash new password
            new_hashed_password = hash_password(reset_data.new_password)
            
            # Update password
            staff.password = new_hashed_password
            await self.db.flush()
            
            # Mark verification code as used
            password_reset.is_used = True
            password_reset.used_at = datetime.now(timezone.utc)
            await self.db.commit()
            
            # Log successful password reset
            await logging_service.log_async(
                level=LogLevel.INFO,
                action=ActionType.PASSWORD_RESET_CONFIRM,
                message=f"✅ Password reset successfully for: {staff.staff_name}",
                data={
                    "staff_id": str(staff.staff_id),
                    "email": staff.email
                }
            )
            
            return True
            
        except Exception as e:
            await self.db.rollback()
            import traceback
            error_trace = traceback.format_exc()
            await logging_service.log_async(
                level=LogLevel.ERROR,
                action=ActionType.PASSWORD_RESET_ERROR,
                message=f"❌ Password reset confirmation error: {str(e)}",
                data={"email": reset_data.email, "error": str(e), "traceback": error_trace}
            )
            print(f"❌ Password reset confirmation error: {str(e)}")
            print(error_trace)
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
