from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
from uuid import UUID
from models.parent import Parent
from schemas.parent_schemas import ParentCreate, ParentUpdate
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs

class ParentService:
    """Service class for Parent CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _clear_parent_cache(self, school_id: UUID):
        """Clear cache for parent operations"""
        await redis_service.delete(f"parents:school:{school_id}")
    
    async def get_all_parents(self, school_id: UUID) -> List[Parent]:
        """Get all parents for a specific school"""
        cache_key = f"parents:school:{school_id}"
        cached_parents = await redis_service.get(cache_key)
        
        if cached_parents:
            return cached_parents
        
        result = await self.db.execute(
            select(Parent).filter(
                Parent.school_id == school_id,
                Parent.is_deleted == False
            )
        )
        parents = result.scalars().all()
        
        parent_data = [parent.to_dict() for parent in parents]
        await redis_service.set(cache_key, parent_data, expire=settings.REDIS_CACHE_TTL)
        
        return parents
    
    async def get_parent_by_id(self, parent_id: UUID, school_id: UUID) -> Optional[Parent]:
        """Get a parent by ID"""
        result = await self.db.execute(
            select(Parent).filter(
                Parent.par_id == parent_id,
                Parent.school_id == school_id,
                Parent.is_deleted == False
            )
        )
        return result.scalar_one_or_none()
    
    async def create_parent(self, parent_data: ParentCreate) -> Parent:
        """Create a new parent"""
        parent = Parent(**parent_data.dict())
        self.db.add(parent)
        await self.db.commit()
        await self.db.refresh(parent)
        
        await self._clear_parent_cache(parent_data.school_id)
        return parent
    
    async def update_parent(self, parent_id: UUID, school_id: UUID, parent_data: ParentUpdate) -> Optional[Parent]:
        """Update a parent"""
        parent = await self.get_parent_by_id(parent_id, school_id)
        if not parent:
            return None
        
        update_data = parent_data.dict(exclude_unset=True)
        await self.db.execute(
            update(Parent)
            .where(Parent.par_id == parent_id)
            .values(**update_data)
        )
        await self.db.commit()
        await self.db.refresh(parent)
        
        await self._clear_parent_cache(school_id)
        return parent
    
    async def delete_parent(self, parent_id: UUID, school_id: UUID) -> bool:
        """Soft delete a parent"""
        parent = await self.get_parent_by_id(parent_id, school_id)
        if not parent:
            return False
        
        await self.db.execute(
            update(Parent)
            .where(Parent.par_id == parent_id)
            .values(is_deleted=True)
        )
        await self.db.commit()
        
        await self._clear_parent_cache(school_id)
        return True

