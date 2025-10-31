from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from database import get_db
from services.auth_service import AuthService
from schemas.auth_schemas import LoginRequest, LoginResponse, ResetPasswordRequest, ResetPasswordConfirm, ChangePasswordRequest
from models.staff import Staff

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
security = HTTPBearer()

async def get_current_staff(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Staff:
    """Get current authenticated staff member"""
    auth_service = AuthService(db)
    staff = await auth_service.get_current_staff(credentials.credentials)
    
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return staff

@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login staff member and get JWT token"""
    try:
        auth_service = AuthService(db)
        result = await auth_service.login(login_data)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}"
        )

@router.post("/reset-password")
async def reset_password_request(reset_data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Request password reset"""
    try:
        auth_service = AuthService(db)
        success = await auth_service.reset_password_request(reset_data)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process password reset request"
            )
        
        return {"message": "Password reset instructions have been sent to your email"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset error: {str(e)}"
        )

@router.post("/reset-password/confirm")
async def reset_password_confirm(reset_data: ResetPasswordConfirm, db: AsyncSession = Depends(get_db)):
    """Confirm password reset with token"""
    try:
        auth_service = AuthService(db)
        success = await auth_service.reset_password_confirm(reset_data)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        return {"message": "Password has been reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset confirmation error: {str(e)}"
        )

@router.post("/change-password")
async def change_password(
    change_data: ChangePasswordRequest,
    current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)
):
    """Change password for authenticated staff member"""
    try:
        auth_service = AuthService(db)
        success = await auth_service.change_password(current_staff.staff_id, change_data)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid current password or failed to change password"
            )
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password change error: {str(e)}"
        )

@router.get("/me")
async def get_current_user_info(current_staff: Staff = Depends(get_current_staff)):
    """Get current authenticated staff member information"""
    return {
        "staff_id": str(current_staff.staff_id),
        "staff_name": current_staff.staff_name,
        "staff_title": current_staff.staff_title,
        "staff_role": current_staff.staff_role,
        "school_id": str(current_staff.school_id),
        "email": current_staff.email,
        "is_active": current_staff.is_active
    }
