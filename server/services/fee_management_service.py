from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from typing import List, Optional, Union, Dict, Any
from uuid import UUID
from models.fee_management import FeeManagement
from models.academic_year import AcademicYear
from models.student import Student
from models.fee_type import FeeType
from schemas.fee_management_schemas import FeeManagementCreate, FeeManagementUpdate
from redis_client import redis_service
from config import settings

class FeeManagementService:
    """Service class for FeeManagement CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _clear_fee_cache(self, school_id: UUID):
        """Clear cache for fee management operations"""
        await redis_service.delete(f"fees:school:{school_id}")
    
    async def get_all_fees(self, school_id: UUID, as_dict: bool = False) -> Union[List[FeeManagement], List[Dict[str, Any]]]:
        """Get all fee management records for a specific school with joined tables"""
        cache_key = f"fees:school:{school_id}"
        
        result = await self.db.execute(
            select(FeeManagement).filter(
                FeeManagement.school_id == school_id,
                FeeManagement.is_deleted == False
            ).options(
                selectinload(FeeManagement.student),
                selectinload(FeeManagement.fee_type),
                selectinload(FeeManagement.academic_year)
            )
        )
        fees = result.scalars().all()
        
        if as_dict:
            # Return dictionaries with joined data
            fee_list = []
            for fee in fees:
                # Access relationships directly - selectinload should have loaded them
                # If relationship doesn't exist or related record is deleted, it will be None
                try:
                    student = fee.student if fee.student is not None else None
                except (AttributeError, Exception):
                    student = None
                
                try:
                    fee_type = fee.fee_type if fee.fee_type is not None else None
                except (AttributeError, Exception):
                    fee_type = None
                
                try:
                    academic_year = fee.academic_year if fee.academic_year is not None else None
                except (AttributeError, Exception):
                    academic_year = None
                
                fee_dict = {
                    # Fee management fields
                    "fee_id": str(fee.fee_id),
                    "school_id": str(fee.school_id),
                    "std_id": str(fee.std_id),
                    "fee_type_id": str(fee.fee_type_id),
                    "academic_id": str(fee.academic_id),
                    "term": fee.term,
                    "amount_paid": float(fee.amount_paid) if fee.amount_paid is not None else 0.0,
                    "status": fee.status,
                    "is_deleted": fee.is_deleted,
                    "created_at": fee.created_at.isoformat() if fee.created_at else None,
                    "updated_at": fee.updated_at.isoformat() if fee.updated_at else None,
                    
                    # Student details (joined from students table)
                    "student_name": student.std_name if student else None,
                    "student": {
                        "std_id": str(student.std_id),
                        "std_name": student.std_name,
                        "std_code": student.std_code,
                        "std_dob": student.std_dob,
                        "std_gender": student.std_gender,
                        "status": student.status,
                    } if student else None,
                    
                    # Fee type details (joined from fee_types table)
                    "fee_type": {
                        "fee_type_id": str(fee_type.fee_type_id),
                        "fee_type_name": fee_type.fee_type_name,
                        "description": fee_type.description,
                        "amount_to_pay": float(fee_type.amount_to_pay) if fee_type.amount_to_pay is not None else 0.0,
                        "is_active": fee_type.is_active,
                    } if fee_type else None,
                    
                    # Academic year details (joined from academic_years table)
                    "academic_year": {
                        "academic_id": str(academic_year.academic_id),
                        "academic_name": academic_year.academic_name,
                        "start_date": academic_year.start_date.isoformat() if academic_year.start_date else None,
                        "end_date": academic_year.end_date.isoformat() if academic_year.end_date else None,
                        "is_current": academic_year.is_current,
                    } if academic_year else None,
                }
                fee_list.append(fee_dict)
            return fee_list
        
        # Return original FeeManagement objects
        fee_data = [fee.to_dict() for fee in fees]
        await redis_service.set(cache_key, fee_data, expire=settings.REDIS_CACHE_TTL)
        
        return fees
    
    async def get_fee_by_id(self, fee_id: UUID, school_id: UUID, as_dict: bool = False) -> Optional[FeeManagement]:
        """Get a fee management record by ID with joined tables"""
        query = select(FeeManagement).filter(
            FeeManagement.fee_id == fee_id,
            FeeManagement.school_id == school_id,
            FeeManagement.is_deleted == False
        ).options(
            selectinload(FeeManagement.student),
            selectinload(FeeManagement.fee_type),
            selectinload(FeeManagement.academic_year)
        )
        
        result = await self.db.execute(query)
        fee = result.scalar_one_or_none()
        
        if fee and as_dict:
            # Return a dictionary with all joined data
            return {
                # Fee management fields
                "fee_id": str(fee.fee_id),
                "school_id": str(fee.school_id),
                "std_id": str(fee.std_id),
                "fee_type_id": str(fee.fee_type_id),
                "academic_id": str(fee.academic_id),
                "term": fee.term,
                "amount_paid": fee.amount_paid,
                "status": fee.status,
                "is_deleted": fee.is_deleted,
                "created_at": fee.created_at.isoformat() if fee.created_at else None,
                "updated_at": fee.updated_at.isoformat() if fee.updated_at else None,
                
                # Student details (joined from students table)
                "student": {
                    "std_id": str(fee.student.std_id),
                    "std_name": fee.student.std_name,
                    "std_code": fee.student.std_code,
                    "std_dob": fee.student.std_dob,
                    "std_gender": fee.student.std_gender,
                    "status": fee.student.status,
                } if fee.student else None,
                
                # Fee type details (joined from fee_types table)
                "fee_type": {
                    "fee_type_id": str(fee.fee_type.fee_type_id),
                    "fee_type_name": fee.fee_type.fee_type_name,
                    "description": fee.fee_type.description,
                    "amount_to_pay": fee.fee_type.amount_to_pay,  # This is the key field requested
                    "is_active": fee.fee_type.is_active,
                } if fee.fee_type else None,
                
                # Academic year details (joined from academic_years table)
                "academic_year": {
                    "academic_id": str(fee.academic_year.academic_id),
                    "academic_name": fee.academic_year.academic_name,
                    "start_date": fee.academic_year.start_date.isoformat() if fee.academic_year.start_date else None,
                    "end_date": fee.academic_year.end_date.isoformat() if fee.academic_year.end_date else None,
                    "is_current": fee.academic_year.is_current,
                } if fee.academic_year else None,
            }
        
        return fee
    
    async def create_fee(self, fee_data: FeeManagementCreate) -> FeeManagement:
        """Create a new fee management record with validation"""
        # Check if academic year exists
        academic_result = await self.db.execute(
            select(AcademicYear).filter(
                AcademicYear.academic_id == fee_data.academic_id,
                AcademicYear.school_id == fee_data.school_id,
                AcademicYear.is_deleted == False
            )
        )
        academic_year = academic_result.scalar_one_or_none()
        if not academic_year:
            raise ValueError(f"Academic year not found in school with ID {fee_data.school_id}")
        
        # Check if student exists
        student_result = await self.db.execute(
            select(Student).filter(
                Student.std_id == fee_data.std_id,
                Student.school_id == fee_data.school_id,
                Student.is_deleted == False
            )
        )
        student = student_result.scalar_one_or_none()
        if not student:
            raise ValueError(f"Student not found in school with ID {fee_data.school_id}")
        
        # Check if fee type exists
        fee_type_result = await self.db.execute(
            select(FeeType).filter(
                FeeType.fee_type_id == fee_data.fee_type_id,
                FeeType.school_id == fee_data.school_id,
                FeeType.is_deleted == False
            )
        )
        fee_type = fee_type_result.scalar_one_or_none()
        if not fee_type:
            raise ValueError(f"Fee type not found in school with ID {fee_data.school_id}")
        
        fee = FeeManagement(**fee_data.dict())
        self.db.add(fee)
        await self.db.commit()
        await self.db.refresh(fee)
        
        await self._clear_fee_cache(fee_data.school_id)
        return fee
    
    async def update_fee(self, fee_id: UUID, school_id: UUID, fee_data: FeeManagementUpdate) -> Optional[FeeManagement]:
        """Update a fee management record"""
        fee = await self.get_fee_by_id(fee_id, school_id)
        if not fee:
            return None
        
        update_data = fee_data.dict(exclude_unset=True)
        await self.db.execute(
            update(FeeManagement)
            .where(FeeManagement.fee_id == fee_id)
            .values(**update_data)
        )
        await self.db.commit()
        await self.db.refresh(fee)
        
        await self._clear_fee_cache(school_id)
        return fee
    
    async def delete_fee(self, fee_id: UUID, school_id: UUID) -> bool:
        """Soft delete a fee management record"""
        fee = await self.get_fee_by_id(fee_id, school_id)
        if not fee:
            return False
        
        await self.db.execute(
            update(FeeManagement)
            .where(FeeManagement.fee_id == fee_id)
            .values(is_deleted=True)
        )
        await self.db.commit()
        
        await self._clear_fee_cache(school_id)
        return True
