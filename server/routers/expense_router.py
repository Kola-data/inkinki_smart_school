from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from database import get_db
from services.expense_service import ExpenseService
from schemas.expense_schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse, PaginatedExpenseResponse
from utils.school_utils import verify_school_active
from utils.auth_dependencies import get_current_staff
from models.staff import Staff
import math

router = APIRouter(prefix="/expenses", tags=["Expense Management"])

@router.get("/", response_model=PaginatedExpenseResponse)
async def get_all_expenses(
    school_id: UUID,
    academic_id: Optional[UUID] = Query(None, description="Filter by academic year ID"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Number of items per page (max 100)"),
    current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)
):
    """Get paginated expense records for a specific school with optional academic year filter"""
    try:
        await verify_school_active(school_id, db)
        expense_service = ExpenseService(db)
        expenses, total = await expense_service.get_all_expenses(
            school_id, 
            academic_id=academic_id,
            page=page,
            page_size=page_size
        )
        
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        
        return PaginatedExpenseResponse(
            items=expenses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense_by_id(expense_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Get an expense record by ID"""
    try:
        await verify_school_active(school_id, db)
        expense_service = ExpenseService(db)
        expense = await expense_service.get_expense_by_id(expense_id, school_id)
        if not expense:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense record not found")
        return expense
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(expense_data: ExpenseCreate, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Create a new expense record"""
    try:
        print(f"[EXPENSE API] Received create request: {expense_data.dict()}")
        await verify_school_active(expense_data.school_id, db)
        expense_service = ExpenseService(db)
        expense = await expense_service.create_expense(expense_data)
        print(f"[EXPENSE API] Expense created successfully: {expense.expense_id}")
        return expense
    except ValueError as e:
        print(f"[EXPENSE API] ValueError: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        print(f"[EXPENSE API] Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(expense_id: UUID, school_id: UUID, expense_data: ExpenseUpdate, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Update an expense record"""
    try:
        await verify_school_active(school_id, db)
        expense_service = ExpenseService(db)
        expense = await expense_service.update_expense(expense_id, school_id, expense_data)
        if not expense:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense record not found")
        return expense
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(expense_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Soft delete an expense record"""
    try:
        await verify_school_active(school_id, db)
        expense_service = ExpenseService(db)
        deleted = await expense_service.delete_expense(expense_id, school_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense record not found")
        return None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

