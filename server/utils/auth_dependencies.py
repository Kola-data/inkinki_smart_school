from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from services.auth_service import AuthService
from services.system_user_service import SystemUserService
from models.staff import Staff
from models.system_user import SystemUser
from typing import Union

security = HTTPBearer(scheme_name="Bearer")

def is_system_user_proxy(staff: Staff) -> bool:
    """Check if a Staff object is actually a system user proxy"""
    return hasattr(staff, '_is_system_user_proxy') and getattr(staff, '_is_system_user_proxy', False) == True

async def get_current_staff(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Staff:
    """
    Get current authenticated staff member.
    Also accepts system users to allow them to access school endpoints.
    For system users, returns a special Staff object that allows access.
    """
    try:
        from utils.auth_utils import verify_token
        from uuid import UUID, uuid4
        from datetime import datetime, timezone
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = credentials.credentials
        
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # First check if it's a system user token (check before trying staff token)
        payload = verify_token(token)
        if payload:
            token_type = payload.get("type")
            # Check if this is a system user token
            if token_type == "system_user":
                user_id = payload.get("sub")
                if not user_id:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid token: missing user ID",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                
                # This is a system user token - authenticate as system user
                try:
                    system_user_service = SystemUserService(db)
                    user = await system_user_service.get_system_user_by_id(UUID(user_id))
                except ValueError as e:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Invalid user ID format: {str(e)}",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                except Exception as e:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Error authenticating system user: {str(e)}",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="System user not found",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                
                account_status = user.account_status.value if user.account_status else None
                if account_status != "active":
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Account is {account_status or 'unknown'}. Please contact administrator.",
                    )
                
                # For system users, create a proxy Staff object
                # This allows system users to access school endpoints
                # Create instance and ensure SQLAlchemy instance state is initialized
                from sqlalchemy.orm import make_transient
                from sqlalchemy import inspect as sa_inspect
                
                # Create the object with all required fields
                proxy_staff = Staff(
                    staff_id=uuid4(),
                    school_id=uuid4(),  # Placeholder, will be validated in endpoint
                    staff_name=user.full_name or user.username or "System User",
                    email=user.email or "system@admin.com",
                    password="",  # Required field, but not used for proxy
                    is_active=True,
                    is_deleted=False,
                    staff_profile=None,
                    staff_dob=None,
                    staff_gender=None,
                    staff_nid_photo=None,
                    staff_title=None,
                    staff_role="admin",
                    employment_type=None,
                    qualifications=None,
                    experience=None,
                    phone=None,
                    created_at=datetime.now(timezone.utc),
                    updated_at=None
                )
                
                # Initialize instance state by adding to session temporarily
                # This ensures _sa_instance_state is properly set
                try:
                    db.add(proxy_staff)
                    # Get the mapper to ensure state is initialized
                    mapper = sa_inspect(Staff)
                    # Make transient - this keeps instance state but detaches from session
                    make_transient(proxy_staff)
                    # Expunge to completely remove from session tracking
                    db.expunge(proxy_staff)
                except Exception:
                    # If something goes wrong, just expunge and continue
                    try:
                        db.expunge(proxy_staff)
                    except:
                        pass
                
                # Mark as system user proxy
                setattr(proxy_staff, '_is_system_user_proxy', True)
                setattr(proxy_staff, '_system_user_id', user.user_id)
                return proxy_staff
        
        # If not a system user token or token verification failed, try as staff token
        try:
            auth_service = AuthService(db)
            staff = await auth_service.get_current_staff(token)
            if staff:
                return staff
        except Exception:
            # Staff token verification failed, continue to raise error
            pass
        
        # If we get here, neither system user nor staff token worked
        # Provide more helpful error message
        if payload:
            token_type = payload.get("type")
            if token_type == "system_user":
                # Token is valid system user token but something else failed
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="System user authentication failed. Please check your account status.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials. Token may be expired or invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_system_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> SystemUser:
    """Get current authenticated system user"""
    try:
        from utils.auth_utils import verify_token
        
        token = credentials.credentials
        payload = verify_token(token)
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if token is for system user
        if payload.get("type") != "system_user":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type for system user",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get system user from database
        from uuid import UUID
        system_user_service = SystemUserService(db)
        user = await system_user_service.get_system_user_by_id(UUID(user_id))
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="System user not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check account status
        account_status_value = user.account_status.value if user.account_status else None
        if account_status_value != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is {account_status_value or 'unknown'}. Please contact administrator.",
            )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user_or_staff(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Union[SystemUser, Staff]:
    """
    Get current authenticated user - accepts both system users and staff members.
    This allows system users to access school endpoints.
    """
    try:
        from utils.auth_utils import verify_token
        
        token = credentials.credentials
        
        # First try to verify as JWT token (system user)
        payload = verify_token(token)
        
        if payload:
            # Check if it's a system user token
            if payload.get("type") == "system_user":
                user_id = payload.get("sub")
                if user_id:
                    from uuid import UUID
                    system_user_service = SystemUserService(db)
                    user = await system_user_service.get_system_user_by_id(UUID(user_id))
                    
                    if user and (user.account_status.value if user.account_status else None) == "active":
                        return user
            
            # If not system user, try as staff token
            # Staff tokens might not have "type" field, so we'll try auth service
            auth_service = AuthService(db)
            staff = await auth_service.get_current_staff(token)
            if staff:
                return staff
        
        # If JWT verification failed, try as staff token
        auth_service = AuthService(db)
        staff = await auth_service.get_current_staff(token)
        if staff:
            return staff
        
        # If both fail, raise error
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

