from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
from uuid import UUID
from models.fee_type import FeeType
from schemas.fee_type_schemas import FeeTypeCreate, FeeTypeUpdate
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs

class FeeTypeService:
    """Service class for FeeType CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _clear_fee_type_cache(self, school_id: UUID):
        """Clear cache for fee type operations"""
        await redis_service.delete(f"fee_types:school:{school_id}")
    
    async def get_all_fee_types(self, school_id: UUID) -> List[FeeType]:
        """Get all fee types for a specific school"""
        cache_key = f"fee_types:school:{school_id}"
        cached_fee_types = await redis_service.get(cache_key)
        
        if cached_fee_types:
            return cached_fee_types
        
        result = await self.db.execute(
            select(FeeType).filter(
                FeeType.school_id == school_id,
                FeeType.is_deleted == False
            )
        )
        fee_types = result.scalars().all()
        
        fee_type_data = [ft.to_dict() for ft in fee_types]
        await redis_service.set(cache_key, fee_type_data, expire=settings.REDIS_CACHE_TTL)
        
        return fee_types
    
    async def get_fee_type_by_id(self, fee_type_id: UUID, school_id: UUID) -> Optional[FeeType]:
        """Get a fee type by ID"""
        result = await self.db.execute(
            select(FeeType).filter(
                FeeType.fee_type_id == fee_type_id,
                FeeType.school_id == school_id,
                FeeType.is_deleted == False
            )
        )
        return result.scalar_one_or_none()
    
    async def create_fee_type(self, fee_type_data: FeeTypeCreate) -> FeeType:
        """Create a new fee type"""
        fee_type = FeeType(**fee_type_data.dict())
        self.db.add(fee_type)
        await self.db.commit()
        await self.db.refresh(fee_type)
        
        await self._clear_fee_type_cache(fee_type_data.school_id)
        return fee_type
    
    async def update_fee_type(self, fee_type_id: UUID, school_id: UUID, fee_type_data: FeeTypeUpdate) -> Optional[FeeType]:
        """Update a fee type"""
        fee_type = await self.get_fee_type_by_id(fee_type_id, school_id)
        if not fee_type:
            return None
        
        update_data = fee_type_data.dict(exclude_unset=True)
        await self.db.execute(
            update(FeeType)
            .where(FeeType.fee_type_id == fee_type_id)
            .values(**update_data)
        )
        await self.db.commit()
        await self.db.refresh(fee_type)
        
        await self._clear_fee_type_cache(school_id)
        return fee_type
    
    async def delete_fee_type(self, fee_type_id: UUID, school_id: UUID) -> bool:
        """Soft delete a fee type"""
        fee_type = await self.get_fee_type_by_id(fee_type_id, school_id)
        if not fee_type:
            return False
        
        await self.db.execute(
            update(FeeType)
            .where(FeeType.fee_type_id == fee_type_id)
            .values(is_deleted=True)
        )
        await self.db.commit()
        
        await self._clear_fee_type_cache(school_id)
        return True
