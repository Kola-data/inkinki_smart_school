from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
from uuid import UUID
from models.fee_detail import FeeDetail
from models.fee_management import FeeManagement
from models.school import School
from schemas.fee_detail_schemas import FeeDetailCreate, FeeDetailUpdate
from redis_client import redis_service
from config import settings

class FeeDetailService:
    """Service class for FeeDetail CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _clear_fee_detail_cache(self, school_id: UUID):
        """Clear cache for fee detail operations"""
        await redis_service.delete(f"fee_details:school:{school_id}")
    
    async def get_all_fee_details(self, school_id: UUID) -> List[FeeDetail]:
        """Get all fee detail records for a specific school"""
        cache_key = f"fee_details:school:{school_id}"
        cached_details = await redis_service.get(cache_key)
        
        if cached_details:
            return cached_details
        
        result = await self.db.execute(
            select(FeeDetail).filter(
                FeeDetail.school_id == school_id,
                FeeDetail.is_deleted == False
            )
        )
        details = result.scalars().all()
        
        detail_data = [detail.to_dict() for detail in details]
        await redis_service.set(cache_key, detail_data, expire=settings.REDIS_CACHE_TTL)
        
        return details
    
    async def get_fee_detail_by_id(self, fee_detail_id: UUID, school_id: UUID) -> Optional[FeeDetail]:
        """Get a fee detail record by ID"""
        result = await self.db.execute(
            select(FeeDetail).filter(
                FeeDetail.fee_detail_id == fee_detail_id,
                FeeDetail.school_id == school_id,
                FeeDetail.is_deleted == False
            )
        )
        return result.scalar_one_or_none()
    
    async def create_fee_detail(self, fee_detail_data: FeeDetailCreate) -> FeeDetail:
        """Create a new fee detail record with validation"""
        # Check if school exists
        school_result = await self.db.execute(
            select(School).filter(
                School.school_id == fee_detail_data.school_id,
                School.is_deleted == False
            )
        )
        school = school_result.scalar_one_or_none()
        if not school:
            raise ValueError(f"School not found with ID {fee_detail_data.school_id}")
        
        # Check if fee management record exists
        fee_result = await self.db.execute(
            select(FeeManagement).filter(
                FeeManagement.fee_id == fee_detail_data.fee_id,
                FeeManagement.school_id == fee_detail_data.school_id,
                FeeManagement.is_deleted == False
            )
        )
        fee_management = fee_result.scalar_one_or_none()
        if not fee_management:
            raise ValueError(f"Fee management record not found with ID {fee_detail_data.fee_id}")
        
        fee_detail = FeeDetail(**fee_detail_data.dict())
        self.db.add(fee_detail)
        await self.db.commit()
        await self.db.refresh(fee_detail)
        
        await self._clear_fee_detail_cache(fee_detail_data.school_id)
        return fee_detail
    
    async def update_fee_detail(self, fee_detail_id: UUID, school_id: UUID, fee_detail_data: FeeDetailUpdate) -> Optional[FeeDetail]:
        """Update a fee detail record"""
        fee_detail = await self.get_fee_detail_by_id(fee_detail_id, school_id)
        if not fee_detail:
            return None
        
        update_data = fee_detail_data.dict(exclude_unset=True)
        await self.db.execute(
            update(FeeDetail)
            .where(FeeDetail.fee_detail_id == fee_detail_id)
            .values(**update_data)
        )
        await self.db.commit()
        await self.db.refresh(fee_detail)
        
        await self._clear_fee_detail_cache(school_id)
        return fee_detail
    
    async def delete_fee_detail(self, fee_detail_id: UUID, school_id: UUID) -> bool:
        """Soft delete a fee detail record"""
        fee_detail = await self.get_fee_detail_by_id(fee_detail_id, school_id)
        if not fee_detail:
            return False
        
        await self.db.execute(
            update(FeeDetail)
            .where(FeeDetail.fee_detail_id == fee_detail_id)
            .values(is_deleted=True)
        )
        await self.db.commit()
        
        await self._clear_fee_detail_cache(school_id)
        return True

