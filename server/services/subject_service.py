from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Optional
from uuid import UUID
from models.subject import Subject
from schemas.subject_schemas import SubjectCreate, SubjectUpdate
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs

class SubjectService:
    """Service class for Subject CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_subjects(self, school_id: UUID) -> List[Subject]:
        """Get all subjects for a specific school"""
        cache_key = f"subjects:school:{school_id}"
        cached_subjects = await redis_service.get(cache_key)
        
        if cached_subjects:
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            process_cache_logs.delay({
                "operation": "get",
                "key": cache_key,
                "hit": True
            })
            return cached_subjects
        
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        process_cache_logs.delay({
            "operation": "get",
            "key": cache_key,
            "hit": False
        })
        
        # Get all subjects for the school
        result = await self.db.execute(
            select(Subject).filter(
                Subject.school_id == school_id,
                Subject.is_deleted == False
            )
        )
        subjects = result.scalars().all()
        
        # Log database operation
        await logging_service.log_database_operation("SELECT", "subjects", data={"count": len(subjects), "school_id": str(school_id)})
        process_database_logs.delay({
            "operation": "SELECT",
            "table": "subjects",
            "data": {"count": len(subjects), "school_id": str(school_id)}
        })
        
        # Cache the result
        subjects_data = [subject.to_dict() for subject in subjects]
        await redis_service.set(cache_key, subjects_data, expire=settings.REDIS_CACHE_TTL)
        
        return subjects
    
    async def get_subject_by_id(self, subj_id: UUID, school_id: UUID) -> Optional[Subject]:
        """Get a subject by ID for a specific school"""
        cache_key = f"subject:{subj_id}:school:{school_id}"
        cached_subject = await redis_service.get(cache_key)
        
        if cached_subject:
            # Create Subject object from cached data
            subject = Subject()
            for key, value in cached_subject.items():
                if hasattr(subject, key):
                    setattr(subject, key, value)
            return subject
        
        # Get subject with school validation
        result = await self.db.execute(
            select(Subject).filter(
                Subject.subj_id == subj_id,
                Subject.school_id == school_id,
                Subject.is_deleted == False
            )
        )
        subject = result.scalar_one_or_none()
        
        if subject:
            # Cache the result
            await redis_service.set(cache_key, subject.to_dict(), expire=settings.REDIS_CACHE_TTL)
        
        return subject
    
    async def create_subject(self, subject_data: SubjectCreate, school_id: UUID) -> Subject:
        """Create a new subject for a specific school"""
        subject = Subject(
            school_id=school_id,
            subj_name=subject_data.subj_name,
            subj_desc=subject_data.subj_desc
        )
        
        self.db.add(subject)
        await self.db.commit()
        await self.db.refresh(subject)
        
        # Clear cache
        await self._clear_subject_cache(school_id)
        
        return subject
    
    async def update_subject(self, subj_id: UUID, subject_data: SubjectUpdate, school_id: UUID) -> Optional[Subject]:
        """Update a subject for a specific school"""
        # Get the subject with school validation
        result = await self.db.execute(
            select(Subject).filter(
                Subject.subj_id == subj_id,
                Subject.school_id == school_id,
                Subject.is_deleted == False
            )
        )
        subject = result.scalar_one_or_none()
        
        if not subject:
            return None
        
        # Update fields that are provided
        update_data = subject_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(subject, field, value)
        
        await self.db.commit()
        await self.db.refresh(subject)
        
        # Clear cache
        await self._clear_subject_cache(school_id)
        await redis_service.delete(f"subject:{subj_id}:school:{school_id}")
        
        return subject
    
    async def soft_delete_subject(self, subj_id: UUID, school_id: UUID) -> bool:
        """Soft delete a subject for a specific school"""
        # First get the subject to verify it exists and belongs to the school
        subject = await self.get_subject_by_id(subj_id, school_id)
        if not subject:
            return False
            
        result = await self.db.execute(
            update(Subject)
            .where(Subject.subj_id == subj_id)
            .values(is_deleted=True)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            # Clear cache
            await self._clear_subject_cache(school_id)
            await redis_service.delete(f"subject:{subj_id}:school:{school_id}")
            return True
        
        return False

    async def _clear_subject_cache(self, school_id: UUID = None):
        """Clear subject-related cache including paginated entries"""
        from utils.clear_cache import clear_cache_by_pattern
        
        await redis_service.delete("subjects:all")
        # Clear school-specific cache if school_id is provided
        if school_id:
            await redis_service.delete(f"subjects:school:{school_id}")
            # Clear all paginated cache entries for this school
            pattern = f"subjects:school:{school_id}*"
            await clear_cache_by_pattern(pattern)
