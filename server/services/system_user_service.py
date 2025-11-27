from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func as sql_func, or_
from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID
from datetime import datetime
from models.system_user import SystemUser, UserRole, AccountStatus
from schemas.system_user_schemas import (
    SystemUserCreate, 
    SystemUserUpdate, 
    SystemUserResponse,
    SystemUserStatusUpdate,
    SystemUserPasswordUpdate,
    SystemUserLoginUpdate
)
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs
from utils.password_utils import hash_password, verify_password
from utils.cache_utils import get_paginated_cache, set_paginated_cache

class SystemUserService:
    """Service class for SystemUser CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_system_users_simple(self) -> List[SystemUser]:
        """Get all system users (simple version without pagination)"""
        result = await self.db.execute(select(SystemUser))
        return list(result.scalars().all())
    
    async def get_all_system_users(
        self, 
        page: int = 1, 
        page_size: int = 50,
        role: Optional[UserRole] = None,
        status: Optional[AccountStatus] = None
    ) -> Tuple[List[SystemUser], int]:
        """Get all system users with pagination and optional filters"""
        cache_key = f"system_users:all:page_{page}:size_{page_size}:role_{role}:status_{status}"
        
        # Try cache first
        cached_data = await get_paginated_cache(cache_key)
        if cached_data:
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            return cached_data['items'], cached_data['total']
        
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        
        # Build query
        query = select(SystemUser)
        
        # Apply filters
        if role:
            query = query.filter(SystemUser.role == role)
        if status:
            query = query.filter(SystemUser.account_status == status)
        
        # Get total count
        count_query = select(sql_func.count()).select_from(SystemUser)
        if role:
            count_query = count_query.filter(SystemUser.role == role)
        if status:
            count_query = count_query.filter(SystemUser.account_status == status)
        
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size).order_by(SystemUser.created_at.desc())
        
        result = await self.db.execute(query)
        users = result.scalars().all()
        
        # Cache the results
        await set_paginated_cache(cache_key, [u.to_dict() for u in users], total, page, page_size)
        
        return users, total
    
    async def get_system_user_by_id(self, user_id: UUID) -> Optional[SystemUser]:
        """Get a system user by ID"""
        cache_key = f"system_user:{user_id}"
        cached_user = await redis_service.get(cache_key)
        
        if cached_user:
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            # Return a SystemUser object from cached data if needed
            # For now, we'll still query DB to get the object
            pass
        
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        
        result = await self.db.execute(
            select(SystemUser).filter(SystemUser.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if user:
            await redis_service.set(cache_key, user.to_dict(), expire=settings.REDIS_CACHE_EXPIRATION_SECONDS)
        
        return user
    
    async def get_system_user_by_username(self, username: str) -> Optional[SystemUser]:
        """Get a system user by username"""
        result = await self.db.execute(
            select(SystemUser).filter(SystemUser.username == username)
        )
        return result.scalar_one_or_none()
    
    async def get_system_user_by_email(self, email: str) -> Optional[SystemUser]:
        """Get a system user by email"""
        result = await self.db.execute(
            select(SystemUser).filter(SystemUser.email == email)
        )
        return result.scalar_one_or_none()
    
    async def create_system_user(self, user_data: SystemUserCreate) -> SystemUser:
        """Create a new system user"""
        # Check if username already exists
        existing_user = await self.get_system_user_by_username(user_data.username)
        if existing_user:
            raise ValueError(f"Username '{user_data.username}' already exists")
        
        # Check if email already exists
        existing_email = await self.get_system_user_by_email(user_data.email)
        if existing_email:
            raise ValueError(f"Email '{user_data.email}' already exists")
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user
        new_user = SystemUser(
            full_name=user_data.full_name,
            username=user_data.username,
            email=user_data.email,
            phone_number=user_data.phone_number,
            profile_image=user_data.profile_image,
            password=hashed_password,
            role=user_data.role,
            account_status=user_data.account_status,
            created_by=None  # Not required
        )
        
        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)
        
        # Log the creation
        await logging_service.log_database_operation(
            ActionType.CREATE,
            "system_users",
            str(new_user.user_id),
            None,
            new_user.to_dict()
        )
        
        # Invalidate cache
        await redis_service.delete("system_users:all:*")
        
        return new_user
    
    async def update_system_user(
        self, 
        user_id: UUID, 
        user_data: SystemUserUpdate
    ) -> Optional[SystemUser]:
        """Update a system user"""
        user = await self.get_system_user_by_id(user_id)
        if not user:
            return None
        
        old_data = user.to_dict()
        
        # Check username uniqueness if changing
        if user_data.username and user_data.username != user.username:
            existing = await self.get_system_user_by_username(user_data.username)
            if existing:
                raise ValueError(f"Username '{user_data.username}' already exists")
        
        # Check email uniqueness if changing
        if user_data.email and user_data.email != user.email:
            existing = await self.get_system_user_by_email(user_data.email)
            if existing:
                raise ValueError(f"Email '{user_data.email}' already exists")
        
        # Update fields
        update_data = user_data.dict(exclude_unset=True)
        
        # Hash password if provided
        if 'password' in update_data:
            update_data['password'] = hash_password(update_data['password'])
        
        # Remove password from update_data if it's None
        if 'password' in update_data and update_data['password'] is None:
            del update_data['password']
        
        for key, value in update_data.items():
            setattr(user, key, value)
        
        await self.db.commit()
        await self.db.refresh(user)
        
        # Log the update
        await logging_service.log_database_operation(
            ActionType.UPDATE,
            "system_users",
            str(user_id),
            old_data,
            user.to_dict()
        )
        
        # Invalidate cache
        await redis_service.delete(f"system_user:{user_id}")
        await redis_service.delete("system_users:all:*")
        
        return user
    
    async def update_password(
        self, 
        user_id: UUID, 
        password_data: SystemUserPasswordUpdate
    ) -> bool:
        """Update user password with current password verification"""
        user = await self.get_system_user_by_id(user_id)
        if not user:
            return False
        
        # Verify current password (password_utils.verify_password takes password first, then hash)
        if not verify_password(password_data.current_password, user.password):
            raise ValueError("Current password is incorrect")
        
        # Update password
        user.password = hash_password(password_data.new_password)
        await self.db.commit()
        
        # Invalidate cache
        await redis_service.delete(f"system_user:{user_id}")
        
        return True
    
    async def update_last_login(
        self, 
        user_id: UUID, 
        login_data: SystemUserLoginUpdate
    ) -> Optional[SystemUser]:
        """Update last login timestamp and device/IP logs"""
        user = await self.get_system_user_by_id(user_id)
        if not user:
            return None
        
        user.last_login = datetime.utcnow()
        
        # Update device/IP logs
        if login_data.device_info or login_data.ip_address:
            current_logs = user.device_ip_logs or {}
            new_log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "device_info": login_data.device_info,
                "ip_address": login_data.ip_address
            }
            
            # Keep last 10 log entries
            if "log_entries" not in current_logs:
                current_logs["log_entries"] = []
            
            current_logs["log_entries"].append(new_log_entry)
            if len(current_logs["log_entries"]) > 10:
                current_logs["log_entries"] = current_logs["log_entries"][-10:]
            
            user.device_ip_logs = current_logs
        
        await self.db.commit()
        await self.db.refresh(user)
        
        # Invalidate cache
        await redis_service.delete(f"system_user:{user_id}")
        
        return user
    
    async def update_account_status(
        self, 
        user_id: UUID, 
        status_data: SystemUserStatusUpdate
    ) -> Optional[SystemUser]:
        """Update account status"""
        user = await self.get_system_user_by_id(user_id)
        if not user:
            return None
        
        old_status = user.account_status
        user.account_status = status_data.account_status
        await self.db.commit()
        await self.db.refresh(user)
        
        # Log the status change
        await logging_service.log_database_operation(
            ActionType.UPDATE,
            "system_users",
            str(user_id),
            {"account_status": old_status.value if old_status else None},
            {"account_status": user.account_status.value}
        )
        
        # Invalidate cache
        await redis_service.delete(f"system_user:{user_id}")
        await redis_service.delete("system_users:all:*")
        
        return user
    
    async def delete_system_user(self, user_id: UUID) -> bool:
        """Soft delete a system user (set account_status to archived)"""
        user = await self.get_system_user_by_id(user_id)
        if not user:
            return False
        
        old_data = user.to_dict()
        user.account_status = AccountStatus.ARCHIVED
        await self.db.commit()
        
        # Log the deletion
        await logging_service.log_database_operation(
            ActionType.DELETE,
            "system_users",
            str(user_id),
            old_data,
            None
        )
        
        # Invalidate cache
        await redis_service.delete(f"system_user:{user_id}")
        await redis_service.delete("system_users:all:*")
        
        return True
    
    async def hard_delete_system_user(self, user_id: UUID) -> bool:
        """Permanently delete a system user (use with caution)"""
        user = await self.get_system_user_by_id(user_id)
        if not user:
            return False
        
        old_data = user.to_dict()
        await self.db.delete(user)
        await self.db.commit()
        
        # Log the deletion
        await logging_service.log_database_operation(
            ActionType.DELETE,
            "system_users",
            str(user_id),
            old_data,
            None
        )
        
        # Invalidate cache
        await redis_service.delete(f"system_user:{user_id}")
        await redis_service.delete("system_users:all:*")
        
        return True

