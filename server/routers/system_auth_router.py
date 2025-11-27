from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from database import get_db
from services.system_user_service import SystemUserService
from models.system_user import SystemUser
from utils.password_utils import verify_password
from utils.auth_utils import create_access_token
from datetime import datetime
from config import settings
from typing import Optional

router = APIRouter(prefix="/system-auth", tags=["System Authentication"])

class SystemLoginRequest(BaseModel):
    username: str
    password: str

class SystemLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    full_name: str
    email: str
    role: str
    account_status: str

@router.post("/login", response_model=SystemLoginResponse)
async def system_login(login_data: SystemLoginRequest, db: AsyncSession = Depends(get_db)):
    """Login system user and get JWT token"""
    try:
        system_user_service = SystemUserService(db)
        user = await system_user_service.get_system_user_by_username(login_data.username)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Check account status
        if user.account_status.value != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is {user.account_status.value}. Please contact administrator."
            )
        
        # Verify password
        if not verify_password(login_data.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Update last login
        from datetime import datetime
        user.last_login = datetime.now()
        await db.commit()
        await db.refresh(user)
        
        # Create JWT token
        token = create_access_token(
            data={"sub": str(user.user_id), "username": user.username, "role": user.role.value, "type": "system_user"}
        )
        
        return SystemLoginResponse(
            access_token=token,
            token_type="bearer",
            user_id=str(user.user_id),
            username=user.username,
            full_name=user.full_name,
            email=user.email,
            role=user.role.value,
            account_status=user.account_status.value
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}"
        )

