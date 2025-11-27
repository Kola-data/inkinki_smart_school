from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Union, Dict, Any, Tuple
from uuid import UUID
from models.fee_management import FeeManagement
from models.fee_invoice import FeeInvoice
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
    
    async def get_all_fees(self, school_id: UUID, academic_id: Optional[UUID] = None, as_dict: bool = False) -> Union[List[FeeManagement], List[Dict[str, Any]]]:
        """Get all fee management records for a specific school with joined tables"""
        cache_key = f"fees:school:{school_id}"
        
        filters = [
            FeeManagement.school_id == school_id,
            FeeManagement.is_deleted == False
        ]
        
        if academic_id:
            filters.append(FeeManagement.academic_id == academic_id)
        
        result = await self.db.execute(
            select(FeeManagement).filter(*filters).options(
                selectinload(FeeManagement.student).selectinload(Student.current_class_obj),
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
                        "current_class_name": student.current_class_obj.cls_name if student and student.current_class_obj else None,
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
                
                # Invoice image
                "invoice_img": fee.invoice_img,
                }
                fee_list.append(fee_dict)
            return fee_list
        
        # Return original FeeManagement objects
        fee_data = [fee.to_dict() for fee in fees]
        await redis_service.set(cache_key, fee_data, expire=settings.REDIS_CACHE_TTL)
        
        return fees
    
    async def get_all_fees_paginated(
        self, 
        school_id: UUID, 
        academic_id: Optional[UUID] = None, 
        page: int = 1,
        page_size: int = 50,
        as_dict: bool = False
    ) -> Tuple[Union[List[FeeManagement], List[Dict[str, Any]]], int]:
        """Get paginated fee management records for a specific school with joined tables"""
        cache_key = f"fees:school:{school_id}"
        if academic_id:
            cache_key += f":academic:{academic_id}"
        cache_key += f":page:{page}:size:{page_size}"
        
        filters = [
            FeeManagement.school_id == school_id,
            FeeManagement.is_deleted == False
        ]
        
        if academic_id:
            filters.append(FeeManagement.academic_id == academic_id)
        
        # Get total count
        count_query = select(func.count(FeeManagement.fee_id)).filter(*filters)
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Get paginated results
        query = (
            select(FeeManagement)
            .filter(*filters)
            .options(
                selectinload(FeeManagement.student).selectinload(Student.current_class_obj),
                selectinload(FeeManagement.fee_type),
                selectinload(FeeManagement.academic_year)
            )
            .order_by(FeeManagement.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        
        result = await self.db.execute(query)
        fees = result.scalars().all()
        
        if as_dict:
            # Return dictionaries with joined data
            fee_list = []
            for fee in fees:
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
                    "student_name": student.std_name if student else None,
                    "student": {
                        "std_id": str(student.std_id),
                        "std_name": student.std_name,
                        "std_code": student.std_code,
                        "current_class_name": student.current_class_obj.cls_name if student and student.current_class_obj else None,
                    } if student else None,
                    "fee_type": {
                        "fee_type_id": str(fee_type.fee_type_id),
                        "fee_type_name": fee_type.fee_type_name,
                        "amount_to_pay": float(fee_type.amount_to_pay) if fee_type.amount_to_pay is not None else 0.0,
                    } if fee_type else None,
                    "academic_year": {
                        "academic_id": str(academic_year.academic_id),
                        "academic_name": academic_year.academic_name,
                        "is_current": academic_year.is_current,
                    } if academic_year else None,
                    "invoice_img": fee.invoice_img,
                }
                fee_list.append(fee_dict)
            return fee_list, total
        
        return fees, total
    
    async def get_fee_by_id(self, fee_id: UUID, school_id: UUID, as_dict: bool = False) -> Optional[FeeManagement]:
        """Get a fee management record by ID with joined tables"""
        query = select(FeeManagement).filter(
            FeeManagement.fee_id == fee_id,
            FeeManagement.school_id == school_id,
            FeeManagement.is_deleted == False
        ).options(
            selectinload(FeeManagement.student).selectinload(Student.current_class_obj),
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
                    "current_class_name": fee.student.current_class_obj.cls_name if fee.student.current_class_obj else None,
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
                
                # Invoice image
                "invoice_img": fee.invoice_img,
            }
        
        return fee
    
    async def create_fee(self, fee_data: FeeManagementCreate) -> FeeManagement:
        """Create a new fee management record.
        If record exists (std_id + term + academic_id), update amount_paid by adding form amount."""
        from utils.file_utils import save_base64_file
        
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
        
        # Check if record exists (std_id + term + academic_id)
        existing_fee_result = await self.db.execute(
            select(FeeManagement).filter(
                FeeManagement.std_id == fee_data.std_id,
                FeeManagement.term == fee_data.term,
                FeeManagement.academic_id == fee_data.academic_id,
                FeeManagement.is_deleted == False
            )
        )
        existing_fee = existing_fee_result.scalar_one_or_none()
        
        # Amount from form
        amount_to_add = fee_data.amount_paid
        
        # Save invoice image if provided
        invoice_path = None
        if fee_data.invoice_img:
            filename = f"invoice_{fee_data.std_id}_{fee_data.term}_{fee_data.academic_id}.png"
            invoice_path = save_base64_file(fee_data.invoice_img, filename, "fee_invoices")
        
        if existing_fee:
            # UPDATE: Add amount to existing amount_paid
            new_amount_paid = existing_fee.amount_paid + amount_to_add
            await self.db.execute(
                update(FeeManagement)
                .where(FeeManagement.fee_id == existing_fee.fee_id)
                .values(
                    amount_paid=new_amount_paid,
                    status=fee_data.status,
                    fee_type_id=fee_data.fee_type_id,
                    invoice_img=invoice_path if invoice_path else existing_fee.invoice_img  # Update or keep existing
                )
            )
            await self.db.refresh(existing_fee)
            fee = existing_fee
        else:
            # INSERT: Create new fee_management record
            fee_dict = fee_data.dict(exclude={'invoice_img'})
            fee_dict['invoice_img'] = invoice_path
            fee = FeeManagement(**fee_dict)
            self.db.add(fee)
            await self.db.flush()  # Flush to get fee_id before creating invoice
        
        # Create fee_invoice record for this transaction
        if amount_to_add > 0:
            fee_invoice = FeeInvoice(
                fee_id=fee.fee_id,
                school_id=fee.school_id,
                amount=amount_to_add,
                invoice_img=invoice_path
            )
            self.db.add(fee_invoice)
        
        # Commit both fee and invoice together
        await self.db.commit()
        await self.db.refresh(fee)
        
        await self._clear_fee_cache(fee_data.school_id)
        return fee
    
    async def update_fee(self, fee_id: UUID, school_id: UUID, fee_data: FeeManagementUpdate) -> Optional[FeeManagement]:
        """Update a fee management record"""
        from utils.file_utils import save_base64_file
        
        fee = await self.get_fee_by_id(fee_id, school_id)
        if not fee:
            return None
        
        # Validate school_id matches
        if fee.school_id != school_id:
            raise ValueError(f"Fee record does not belong to school {school_id}")
        
        # Save invoice image if provided
        invoice_path = None
        if fee_data.invoice_img:
            filename = f"invoice_{fee_id}.png"
            invoice_path = save_base64_file(fee_data.invoice_img, filename, "fee_invoices")
        
        # Determine if we should replace or add amount
        replace_amount = fee_data.replace_amount if fee_data.replace_amount is not None else False
        
        update_data = fee_data.dict(exclude_unset=True, exclude={'invoice_img', 'replace_amount'})
        
        # Handle amount_paid update
        if fee_data.amount_paid is not None:
            if replace_amount:
                # Replace the amount (used for transaction updates)
                update_data['amount_paid'] = fee_data.amount_paid
            else:
                # Add to existing amount (used for regular payment updates)
                new_amount_paid = fee.amount_paid + fee_data.amount_paid
                update_data['amount_paid'] = new_amount_paid
                
                # Create fee_invoice record for this payment transaction
                if fee_data.amount_paid > 0:
                    fee_invoice = FeeInvoice(
                        fee_id=fee.fee_id,
                        school_id=fee.school_id,
                        amount=fee_data.amount_paid,
                        invoice_img=invoice_path
                    )
                    self.db.add(fee_invoice)
        
        if invoice_path:
            update_data['invoice_img'] = invoice_path
        
        await self.db.execute(
            update(FeeManagement)
            .where(FeeManagement.fee_id == fee_id)
            .values(**update_data)
        )
        
        # Commit both fee update and invoice together
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
    
    async def create_bulk_fees(self, fee_records: List[FeeManagementCreate]) -> List[FeeManagement]:
        """Create multiple fee management records.
        If record exists (std_id + term + academic_id), update amount_paid by adding form amount."""
        from utils.file_utils import save_base64_file
        from sqlalchemy import update
        
        # Validate all records first
        validation_tasks = []
        for fee_data in fee_records:
            # Check academic year
            academic_task = self.db.execute(
                select(AcademicYear).filter(
                    AcademicYear.academic_id == fee_data.academic_id,
                    AcademicYear.school_id == fee_data.school_id,
                    AcademicYear.is_deleted == False
                )
            )
            # Check student
            student_task = self.db.execute(
                select(Student).filter(
                    Student.std_id == fee_data.std_id,
                    Student.school_id == fee_data.school_id,
                    Student.is_deleted == False
                )
            )
            # Check fee type
            fee_type_task = self.db.execute(
                select(FeeType).filter(
                    FeeType.fee_type_id == fee_data.fee_type_id,
                    FeeType.school_id == fee_data.school_id,
                    FeeType.is_deleted == False
                )
            )
            validation_tasks.append((academic_task, student_task, fee_type_task))
        
        # Execute all validations
        validation_results = []
        for academic_task, student_task, fee_type_task in validation_tasks:
            academic_result = await academic_task
            student_result = await student_task
            fee_type_result = await fee_type_task
            
            academic_year = academic_result.scalar_one_or_none()
            student = student_result.scalar_one_or_none()
            fee_type = fee_type_result.scalar_one_or_none()
            
            validation_results.append((academic_year, student, fee_type))
        
        # Process all fee records
        created_fees = []
        school_id = fee_records[0].school_id if fee_records else None
        
        for idx, fee_data in enumerate(fee_records):
            academic_year, student, fee_type = validation_results[idx]
            
            if not academic_year:
                raise ValueError(f"Academic year not found for record {idx + 1}")
            if not student:
                raise ValueError(f"Student not found for record {idx + 1}")
            if not fee_type:
                raise ValueError(f"Fee type not found for record {idx + 1}")
            
            # Check if record exists (std_id + term + academic_id)
            existing_fee_result = await self.db.execute(
                select(FeeManagement).filter(
                    FeeManagement.std_id == fee_data.std_id,
                    FeeManagement.term == fee_data.term,
                    FeeManagement.academic_id == fee_data.academic_id,
                    FeeManagement.is_deleted == False
                )
            )
            existing_fee = existing_fee_result.scalar_one_or_none()
            
            # Amount from form
            amount_to_add = fee_data.amount_paid
            
            # Save invoice image if provided
            invoice_path = None
            if fee_data.invoice_img:
                filename = f"invoice_{fee_data.std_id}_{fee_data.term}_{fee_data.academic_id}_{idx}.png"
                invoice_path = save_base64_file(fee_data.invoice_img, filename, "fee_invoices")
            
            if existing_fee:
                # UPDATE: Add amount to existing amount_paid
                new_amount_paid = existing_fee.amount_paid + amount_to_add
                await self.db.execute(
                    update(FeeManagement)
                    .where(FeeManagement.fee_id == existing_fee.fee_id)
                    .values(
                        amount_paid=new_amount_paid,
                        status=fee_data.status,  # Update status
                        fee_type_id=fee_data.fee_type_id,  # Update fee type if changed
                        invoice_img=invoice_path if invoice_path else existing_fee.invoice_img  # Update or keep existing
                    )
                )
                await self.db.refresh(existing_fee)
                fee = existing_fee
            else:
                # INSERT: Create new fee_management record
                fee_dict = fee_data.dict(exclude={'invoice_img'})
                fee_dict['invoice_img'] = invoice_path
                fee = FeeManagement(**fee_dict)
                self.db.add(fee)
                await self.db.flush()  # Flush to get fee_id
                await self.db.refresh(fee)
            
            created_fees.append(fee)
            
            # Create fee_invoice record for this transaction if amount was added
            if amount_to_add > 0:
                fee_invoice = FeeInvoice(
                    fee_id=fee.fee_id,
                    school_id=fee.school_id,
                    amount=amount_to_add,
                    invoice_img=invoice_path
                )
                self.db.add(fee_invoice)
        
        # Commit all at once (fees and invoices)
        await self.db.commit()
        
        # Refresh all created fees
        for fee in created_fees:
            await self.db.refresh(fee)
        
        if school_id:
            await self._clear_fee_cache(school_id)
        
        return created_fees
    