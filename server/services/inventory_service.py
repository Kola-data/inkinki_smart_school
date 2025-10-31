from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
from uuid import UUID
from models.inventory import Inventory
from models.school import School
from schemas.inventory_schemas import InventoryCreate, InventoryUpdate
from redis_client import redis_service
from config import settings

class InventoryService:
    """Service class for Inventory CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _clear_inventory_cache(self, school_id: UUID):
        """Clear cache for inventory operations"""
        await redis_service.delete(f"inventory:school:{school_id}")
    
    async def get_all_inventory(self, school_id: UUID) -> List[Inventory]:
        """Get all inventory records for a specific school"""
        cache_key = f"inventory:school:{school_id}"
        cached_inventory = await redis_service.get(cache_key)
        
        if cached_inventory:
            return cached_inventory
        
        result = await self.db.execute(
            select(Inventory).filter(
                Inventory.school_id == school_id,
                Inventory.is_deleted == False
            )
        )
        inventory = result.scalars().all()
        
        inventory_data = [item.to_dict() for item in inventory]
        await redis_service.set(cache_key, inventory_data, expire=settings.REDIS_CACHE_TTL)
        
        return inventory
    
    async def get_inventory_by_id(self, inv_id: UUID, school_id: UUID) -> Optional[Inventory]:
        """Get an inventory record by ID"""
        result = await self.db.execute(
            select(Inventory).filter(
                Inventory.inv_id == inv_id,
                Inventory.school_id == school_id,
                Inventory.is_deleted == False
            )
        )
        return result.scalar_one_or_none()
    
    async def create_inventory(self, inventory_data: InventoryCreate) -> Inventory:
        """Create a new inventory record with validation"""
        # Check if school exists
        school_result = await self.db.execute(
            select(School).filter(
                School.school_id == inventory_data.school_id,
                School.is_deleted == False
            )
        )
        school = school_result.scalar_one_or_none()
        if not school:
            raise ValueError(f"School not found with ID {inventory_data.school_id}")
        
        inventory = Inventory(**inventory_data.dict())
        self.db.add(inventory)
        await self.db.commit()
        await self.db.refresh(inventory)
        
        await self._clear_inventory_cache(inventory_data.school_id)
        return inventory
    
    async def update_inventory(self, inv_id: UUID, school_id: UUID, inventory_data: InventoryUpdate) -> Optional[Inventory]:
        """Update an inventory record"""
        inventory = await self.get_inventory_by_id(inv_id, school_id)
        if not inventory:
            return None
        
        update_data = inventory_data.dict(exclude_unset=True)
        await self.db.execute(
            update(Inventory)
            .where(Inventory.inv_id == inv_id)
            .values(**update_data)
        )
        await self.db.commit()
        await self.db.refresh(inventory)
        
        await self._clear_inventory_cache(school_id)
        return inventory
    
    async def delete_inventory(self, inv_id: UUID, school_id: UUID) -> bool:
        """Soft delete an inventory record"""
        inventory = await self.get_inventory_by_id(inv_id, school_id)
        if not inventory:
            return False
        
        await self.db.execute(
            update(Inventory)
            .where(Inventory.inv_id == inv_id)
            .values(is_deleted=True)
        )
        await self.db.commit()
        
        await self._clear_inventory_cache(school_id)
        return True

