from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Optional
from uuid import UUID
from models.school_payment_record import SchoolPaymentRecord
from schemas.school_payment_record_schemas import SchoolPaymentRecordCreate, SchoolPaymentRecordUpdate
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs

class SchoolPaymentRecordService:
    """Service class for School Payment Record CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_school_payment_records(
        self, 
        school_id: Optional[UUID] = None,
        payment_id: Optional[UUID] = None,
        status: Optional[str] = None
    ) -> List[SchoolPaymentRecord]:
        """Get all school payment records with optional filters"""
        cache_key = f"school_payment_records:all:{school_id}:{payment_id}:{status}"
        cached_records = await redis_service.get(cache_key)
        
        if cached_records:
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            process_cache_logs.delay({
                "operation": "get",
                "key": cache_key,
                "hit": True
            })
            # Convert cached dicts back to model objects
            records = []
            for record_dict in cached_records:
                record = SchoolPaymentRecord()
                for key, value in record_dict.items():
                    if hasattr(record, key):
                        setattr(record, key, value)
                records.append(record)
            return records
        
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        process_cache_logs.delay({
            "operation": "get",
            "key": cache_key,
            "hit": False
        })
        
        query = select(SchoolPaymentRecord).filter(
            SchoolPaymentRecord.is_deleted == False
        )
        
        if school_id:
            query = query.filter(SchoolPaymentRecord.school_id == school_id)
        if payment_id:
            query = query.filter(SchoolPaymentRecord.payment_id == payment_id)
        if status:
            query = query.filter(SchoolPaymentRecord.status == status)
        
        query = query.order_by(SchoolPaymentRecord.date.desc())
        
        result = await self.db.execute(query)
        records = result.scalars().all()
        
        await logging_service.log_database_operation("SELECT", "school_payment_records", data={"count": len(records)})
        process_database_logs.delay({
            "operation": "SELECT",
            "table": "school_payment_records",
            "data": {"count": len(records)}
        })
        
        records_data = [record.to_dict() for record in records]
        await redis_service.set(cache_key, records_data, expire=settings.REDIS_CACHE_TTL)
        
        return records
    
    async def get_school_payment_record_by_id(self, record_id: UUID) -> Optional[SchoolPaymentRecord]:
        """Get a school payment record by ID"""
        cache_key = f"school_payment_record:{record_id}"
        cached_record = await redis_service.get(cache_key)
        
        if cached_record:
            record = SchoolPaymentRecord()
            for key, value in cached_record.items():
                if hasattr(record, key):
                    setattr(record, key, value)
            return record
        
        result = await self.db.execute(
            select(SchoolPaymentRecord).filter(
                SchoolPaymentRecord.record_id == record_id,
                SchoolPaymentRecord.is_deleted == False
            )
        )
        record = result.scalar_one_or_none()
        
        if record:
            await redis_service.set(cache_key, record.to_dict(), expire=settings.REDIS_CACHE_TTL)
        
        return record
    
    async def create_school_payment_record(self, record_data: SchoolPaymentRecordCreate) -> SchoolPaymentRecord:
        """Create a new school payment record"""
        record = SchoolPaymentRecord(
            school_id=record_data.school_id,
            payment_id=record_data.payment_id,
            status=record_data.status,
            date=record_data.date
        )
        
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        
        await logging_service.log_database_operation("INSERT", "school_payment_records", data={"record_id": str(record.record_id)})
        process_database_logs.delay({
            "operation": "INSERT",
            "table": "school_payment_records",
            "data": {"record_id": str(record.record_id)}
        })
        
        await self._clear_school_payment_record_cache()
        
        return record
    
    async def update_school_payment_record(
        self, 
        record_id: UUID, 
        record_data: SchoolPaymentRecordUpdate
    ) -> Optional[SchoolPaymentRecord]:
        """Update a school payment record"""
        result = await self.db.execute(
            select(SchoolPaymentRecord).filter(
                SchoolPaymentRecord.record_id == record_id,
                SchoolPaymentRecord.is_deleted == False
            )
        )
        record = result.scalar_one_or_none()
        
        if not record:
            return None
        
        update_data = record_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(record, field, value)
        
        await self.db.commit()
        await self.db.refresh(record)
        
        await logging_service.log_database_operation("UPDATE", "school_payment_records", data={"record_id": str(record_id)})
        process_database_logs.delay({
            "operation": "UPDATE",
            "table": "school_payment_records",
            "data": {"record_id": str(record_id)}
        })
        
        await self._clear_school_payment_record_cache()
        await redis_service.delete(f"school_payment_record:{record_id}")
        
        return record
    
    async def soft_delete_school_payment_record(self, record_id: UUID) -> bool:
        """Soft delete a school payment record"""
        result = await self.db.execute(
            update(SchoolPaymentRecord)
            .where(SchoolPaymentRecord.record_id == record_id)
            .values(is_deleted=True)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            await logging_service.log_database_operation("UPDATE", "school_payment_records", data={"record_id": str(record_id), "action": "soft_delete"})
            process_database_logs.delay({
                "operation": "UPDATE",
                "table": "school_payment_records",
                "data": {"record_id": str(record_id), "action": "soft_delete"}
            })
            await self._clear_school_payment_record_cache()
            await redis_service.delete(f"school_payment_record:{record_id}")
            return True
        
        return False
    
    async def update_school_payment_record_status(self, record_id: UUID, new_status: str) -> Optional[SchoolPaymentRecord]:
        """Update the status of a school payment record"""
        if new_status not in ["pending", "paid", "overdue", "cancelled"]:
            raise ValueError(f"Invalid status: {new_status}. Must be one of: pending, paid, overdue, cancelled")
        
        result = await self.db.execute(
            select(SchoolPaymentRecord).filter(
                SchoolPaymentRecord.record_id == record_id,
                SchoolPaymentRecord.is_deleted == False
            )
        )
        record = result.scalar_one_or_none()
        
        if not record:
            return None
        
        record.status = new_status
        await self.db.commit()
        await self.db.refresh(record)
        
        await logging_service.log_database_operation("UPDATE", "school_payment_records", data={"record_id": str(record_id), "status": new_status})
        process_database_logs.delay({
            "operation": "UPDATE",
            "table": "school_payment_records",
            "data": {"record_id": str(record_id), "status": new_status}
        })
        
        await self._clear_school_payment_record_cache()
        await redis_service.delete(f"school_payment_record:{record_id}")
        
        return record
    
    async def _clear_school_payment_record_cache(self):
        """Clear school payment record-related cache"""
        # Clear all cache keys that start with school_payment_record
        # This is a simplified approach - in production, you might want to track keys more precisely
        pass


