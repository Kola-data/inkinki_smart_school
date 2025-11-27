from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func as sql_func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Tuple
from uuid import UUID
from models.expense import Expense
from models.school import School
from models.academic_year import AcademicYear
from schemas.expense_schemas import ExpenseCreate, ExpenseUpdate
from redis_client import redis_service
from config import settings

class ExpenseService:
    """Service class for Expense CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _clear_expense_cache(self, school_id: UUID, academic_id: Optional[UUID] = None):
        """Clear cache for expense operations"""
        # Clear all cache patterns for this school
        patterns = [
            f"expense:school:{school_id}*"
        ]
        if academic_id:
            patterns.append(f"expense:school:{school_id}:academic:{academic_id}*")
        
        for pattern in patterns:
            # Note: Redis delete with pattern requires SCAN, which we'll do in batches
            # For now, clear specific keys
            await redis_service.delete(pattern)
    
    async def get_all_expenses(
        self, 
        school_id: UUID, 
        academic_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 50,
        skip_cache: bool = False
    ) -> Tuple[List[Expense], int]:
        """Get paginated expense records for a specific school with optional academic year filter"""
        # Build cache key
        cache_key = f"expense:school:{school_id}"
        if academic_id:
            cache_key += f":academic:{academic_id}"
        cache_key += f":page:{page}:size:{page_size}"
        
        if not skip_cache:
            cached_expenses = await redis_service.get(cache_key)
            if cached_expenses and isinstance(cached_expenses, dict):
                # Return cached data if available
                items = cached_expenses.get('items', [])
                total = cached_expenses.get('total', 0)
                # Convert dicts back to Expense objects would be complex, so we'll fetch from DB
                # But we can use the total for optimization
        
        # Build query with filters
        filters = [
            Expense.school_id == school_id,
            Expense.is_deleted == False
        ]
        
        if academic_id:
            filters.append(Expense.academic_id == academic_id)
        
        # Get total count for pagination
        count_query = select(sql_func.count(Expense.expense_id)).filter(*filters)
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Get paginated results with relationships loaded
        query = (
            select(Expense)
            .filter(*filters)
            .options(selectinload(Expense.academic_year))
            .order_by(Expense.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        
        result = await self.db.execute(query)
        expenses = result.scalars().all()
        
        # Cache the result
        expenses_data = {
            'items': [expense.to_dict() for expense in expenses],
            'total': total
        }
        await redis_service.set(cache_key, expenses_data, expire=settings.REDIS_CACHE_TTL)
        
        return expenses, total
    
    async def get_expense_by_id(self, expense_id: UUID, school_id: UUID) -> Optional[Expense]:
        """Get an expense record by ID"""
        result = await self.db.execute(
            select(Expense)
            .filter(
                Expense.expense_id == expense_id,
                Expense.school_id == school_id,
                Expense.is_deleted == False
            )
            .options(selectinload(Expense.academic_year))
        )
        expense = result.scalar_one_or_none()
        # Return Expense model instance - FastAPI will serialize it using ExpenseResponse
        return expense
    
    async def create_expense(self, expense_data: ExpenseCreate) -> Expense:
        """Create a new expense record with validation"""
        from utils.file_utils import save_base64_file
        
        # Check if school exists
        school_result = await self.db.execute(
            select(School).filter(
                School.school_id == expense_data.school_id,
                School.is_deleted == False
            )
        )
        school = school_result.scalar_one_or_none()
        if not school:
            raise ValueError(f"School not found with ID {expense_data.school_id}")
        
        # Check if academic year exists (if provided)
        if expense_data.academic_id:
            academic_result = await self.db.execute(
                select(AcademicYear).filter(
                    AcademicYear.academic_id == expense_data.academic_id,
                    AcademicYear.school_id == expense_data.school_id,
                    AcademicYear.is_deleted == False
                )
            )
            academic_year = academic_result.scalar_one_or_none()
            if not academic_year:
                raise ValueError(f"Academic year not found with ID {expense_data.academic_id} in school {expense_data.school_id}")
        
        # Validate status
        valid_statuses = ['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'ARCHIVED']
        if expense_data.status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        # Validate payment method if provided
        if expense_data.payment_method:
            valid_methods = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'ONLINE_PAYMENT']
            if expense_data.payment_method not in valid_methods:
                raise ValueError(f"Invalid payment method. Must be one of: {', '.join(valid_methods)}")
        
        # Save invoice images to disk
        invoice_paths = []
        if expense_data.invoice_image:
            for idx, img_data in enumerate(expense_data.invoice_image):
                if img_data and img_data.startswith('data:'):
                    # It's a base64 image, save it
                    # Sanitize title for filename (remove special characters)
                    safe_title = "".join(c for c in expense_data.title if c.isalnum() or c in (' ', '-', '_')).strip()[:50]
                    filename = f"expense_{safe_title}_{idx}.png" if safe_title else f"expense_{idx}.png"
                    invoice_path = save_base64_file(img_data, filename, "expense_invoice")
                    if invoice_path:
                        invoice_paths.append(invoice_path)
                elif img_data and not img_data.startswith('http'):
                    # It's already a file path, keep it
                    invoice_paths.append(img_data)
        
        expense_dict = expense_data.dict(exclude={'invoice_image'})
        expense_dict['invoice_image'] = invoice_paths if invoice_paths else None
        
        # Convert empty strings to None for optional fields
        if expense_dict.get('description') == '':
            expense_dict['description'] = None
        if expense_dict.get('payment_method') == '':
            expense_dict['payment_method'] = None
        if expense_dict.get('expense_date') == '':
            expense_dict['expense_date'] = None
        
        expense = Expense(**expense_dict)
        self.db.add(expense)
        await self.db.commit()
        await self.db.refresh(expense)
        
        await self._clear_expense_cache(expense_data.school_id, expense_data.academic_id)
        # Return the Expense model instance - FastAPI will serialize it using ExpenseResponse
        return expense
    
    async def update_expense(self, expense_id: UUID, school_id: UUID, expense_data: ExpenseUpdate) -> Optional[Expense]:
        """Update an expense record"""
        # Check if expense exists
        result = await self.db.execute(
            select(Expense).filter(
                Expense.expense_id == expense_id,
                Expense.school_id == school_id,
                Expense.is_deleted == False
            )
        )
        expense = result.scalar_one_or_none()
        if not expense:
            return None
        
        # Validate school_id matches
        if expense.school_id != school_id:
            raise ValueError(f"Expense record does not belong to school {school_id}")
        
        # Validate status if provided
        if expense_data.status:
            valid_statuses = ['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'ARCHIVED']
            if expense_data.status not in valid_statuses:
                raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        # Validate payment method if provided
        if expense_data.payment_method:
            valid_methods = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'ONLINE_PAYMENT']
            if expense_data.payment_method not in valid_methods:
                raise ValueError(f"Invalid payment method. Must be one of: {', '.join(valid_methods)}")
        
        # Handle invoice images
        update_data = expense_data.dict(exclude_unset=True, exclude={'invoice_image'})
        
        # Convert empty strings to None for optional fields
        if update_data.get('description') == '':
            update_data['description'] = None
        if update_data.get('payment_method') == '':
            update_data['payment_method'] = None
        if update_data.get('expense_date') == '':
            update_data['expense_date'] = None
        
        if expense_data.invoice_image is not None:
            from utils.file_utils import save_base64_file
            invoice_paths = []
            
            # Get existing invoice paths
            existing_paths = expense.invoice_image if expense.invoice_image else []
            
            for img_data in expense_data.invoice_image:
                if img_data and img_data.startswith('data:'):
                    # It's a new base64 image, save it
                    filename = f"expense_{expense.expense_id}_{len(invoice_paths)}.png"
                    invoice_path = save_base64_file(img_data, filename, "expense_invoice")
                    if invoice_path:
                        invoice_paths.append(invoice_path)
                elif img_data and not img_data.startswith('http'):
                    # It's already a file path, keep it
                    invoice_paths.append(img_data)
                elif img_data in existing_paths:
                    # Keep existing image
                    invoice_paths.append(img_data)
            
            update_data['invoice_image'] = invoice_paths if invoice_paths else None
        
        await self.db.execute(
            update(Expense)
            .where(Expense.expense_id == expense_id)
            .values(**update_data)
        )
        await self.db.commit()
        
        # Fetch updated expense
        result = await self.db.execute(
            select(Expense).filter(
                Expense.expense_id == expense_id,
                Expense.school_id == school_id,
                Expense.is_deleted == False
            )
        )
        updated_expense = result.scalar_one_or_none()
        
        await self._clear_expense_cache(school_id, updated_expense.academic_id if updated_expense else None)
        # Return Expense model instance - FastAPI will serialize it using ExpenseResponse
        return updated_expense
    
    async def delete_expense(self, expense_id: UUID, school_id: UUID) -> bool:
        """Soft delete an expense record"""
        # Check if expense exists
        result = await self.db.execute(
            select(Expense).filter(
                Expense.expense_id == expense_id,
                Expense.school_id == school_id,
                Expense.is_deleted == False
            )
        )
        expense = result.scalar_one_or_none()
        if not expense:
            return False
        
        # Validate school_id matches
        if expense.school_id != school_id:
            raise ValueError(f"Expense record does not belong to school {school_id}")
        
        await self.db.execute(
            update(Expense)
            .where(Expense.expense_id == expense_id)
            .values(is_deleted=True)
        )
        await self.db.commit()
        
        # Get academic_id before deletion for cache clearing
        academic_id = expense.academic_id if expense else None
        await self._clear_expense_cache(school_id, academic_id)
        return True

