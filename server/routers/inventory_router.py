from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from database import get_db
from services.inventory_service import InventoryService
from schemas.inventory_schemas import InventoryCreate, InventoryUpdate, InventoryResponse

router = APIRouter(prefix="/inventory", tags=["Inventory Management"])

@router.get("/", response_model=List[InventoryResponse])
async def get_all_inventory(school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get all inventory records for a specific school"""
    try:
        inventory_service = InventoryService(db)
        inventory = await inventory_service.get_all_inventory(school_id)
        return inventory
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{inv_id}", response_model=InventoryResponse)
async def get_inventory_by_id(inv_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get an inventory record by ID"""
    try:
        inventory_service = InventoryService(db)
        inventory = await inventory_service.get_inventory_by_id(inv_id, school_id)
        if not inventory:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")
        return inventory
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory(inventory_data: InventoryCreate, db: AsyncSession = Depends(get_db)):
    """Create a new inventory record"""
    try:
        inventory_service = InventoryService(db)
        inventory = await inventory_service.create_inventory(inventory_data)
        return inventory
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{inv_id}", response_model=InventoryResponse)
async def update_inventory(inv_id: UUID, school_id: UUID, inventory_data: InventoryUpdate, db: AsyncSession = Depends(get_db)):
    """Update an inventory record"""
    try:
        inventory_service = InventoryService(db)
        inventory = await inventory_service.update_inventory(inv_id, school_id, inventory_data)
        if not inventory:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")
        return inventory
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{inv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory(inv_id: UUID, school_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete an inventory record"""
    try:
        inventory_service = InventoryService(db)
        deleted = await inventory_service.delete_inventory(inv_id, school_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

