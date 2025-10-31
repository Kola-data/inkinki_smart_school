from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db, test_db_connection
from redis_client import test_redis_connection, redis_service
# Import TestRecord from models.py file directly
import importlib.util
import os
spec = importlib.util.spec_from_file_location("models_module", os.path.join(os.path.dirname(__file__), "models.py"))
models_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(models_module)
TestRecord = models_module.TestRecord
from config import settings
from pydantic import BaseModel
from typing import List, Optional
import time

# Import school models and schemas
from models.school import School
from schemas.school_schemas import SchoolCreate, SchoolUpdate, SchoolResponse
from services.school_service import SchoolService

# Import routers
from routers.staff_router import router as staff_router
from routers.school_router import router as school_router
from routers.auth_router import router as auth_router
from routers.teacher_router import router as teacher_router
from routers.academic_year_router import router as academic_year_router
from routers.class_router import router as class_router
from routers.class_teacher_router import router as class_teacher_router
from routers.subject_router import router as subject_router
from routers.parent_router import router as parent_router
from routers.student_router import router as student_router
from routers.fee_type_router import router as fee_type_router
from routers.fee_management_router import router as fee_management_router
from routers.fee_detail_router import router as fee_detail_router
from routers.inventory_router import router as inventory_router
from routers.attendance_router import router as attendance_router
from routers.assessment_router import router as assessment_router
from routers.exam_router import router as exam_router

# Import logging services
from services.logging_service import logging_service, LogLevel, ActionType
from middleware.logging_middleware import LoggingMiddleware
from tasks.background_tasks import process_database_logs, process_cache_logs

# Rate limiting imports
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    debug=settings.DEBUG
)

# Configure rate limiting - DISABLED FOR TESTING
# limiter = Limiter(
#     key_func=get_remote_address,
#     storage_uri=settings.REDIS_URL,
#     default_limits=["1000 per hour", "100 per minute"]
# )
# app.state.limiter = limiter
# app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add logging middleware
app.add_middleware(LoggingMiddleware)

# Include routers
app.include_router(school_router, prefix="/api/v1")
app.include_router(staff_router, prefix="/api/v1")
app.include_router(teacher_router, prefix="/api/v1")
app.include_router(academic_year_router, prefix="/api/v1")
app.include_router(subject_router, prefix="/api/v1")
app.include_router(class_router, prefix="/api/v1")
app.include_router(class_teacher_router, prefix="/api/v1")
app.include_router(parent_router, prefix="/api/v1")
app.include_router(student_router, prefix="/api/v1")
app.include_router(fee_type_router, prefix="/api/v1")
app.include_router(fee_management_router, prefix="/api/v1")
app.include_router(fee_detail_router, prefix="/api/v1")
app.include_router(inventory_router, prefix="/api/v1")
app.include_router(attendance_router, prefix="/api/v1")
app.include_router(assessment_router, prefix="/api/v1")
app.include_router(exam_router, prefix="/api/v1")
app.include_router(auth_router)

# School endpoints will be added below

# Pydantic models for request/response
class TestRecordCreate(BaseModel):
    name: str
    description: Optional[str] = None

class TestRecordResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True

# # Health check endpoint
# @app.get("/health")
# async def health_check():
#     """Health check endpoint to verify all services are running"""
#     db_status = await test_db_connection()
#     redis_status = await test_redis_connection()
    
#     return {
#         "status": "healthy" if db_status and redis_status else "unhealthy",
#         "database": "connected" if db_status else "disconnected",
#         "redis": "connected" if redis_status else "disconnected",
#         "timestamp": time.time()
#     }

# # Test endpoint that uses both PostgreSQL and Redis
# @app.post("/test", response_model=TestRecordResponse)
# async def create_test_record(
#     record: TestRecordCreate,
#     db: AsyncSession = Depends(get_db)
# ):
#     """Create a test record in PostgreSQL and cache it in Redis"""
    
#     # Create record in PostgreSQL
#     db_record = TestRecord(
#         name=record.name,
#         description=record.description
#     )
#     db.add(db_record)
#     await db.commit()
#     await db.refresh(db_record)
    
#     # Cache the record in Redis
#     cache_key = f"test_record:{db_record.id}"
#     await redis_service.set(cache_key, db_record.to_dict(), expire=settings.REDIS_CACHE_TTL)
    
#     return TestRecordResponse(**db_record.to_dict())

# @app.get("/test/{record_id}", response_model=TestRecordResponse)
# async def get_test_record(
#     record_id: int,
#     db: AsyncSession = Depends(get_db)
# ):
#     """Get a test record, first from Redis cache, then from PostgreSQL"""
    
#     # Try to get from Redis cache first
#     cache_key = f"test_record:{record_id}"
#     cached_record = await redis_service.get(cache_key)
    
#     if cached_record:
#         return TestRecordResponse(**cached_record)
    
#     # If not in cache, get from database
#     from sqlalchemy import select
#     result = await db.execute(select(TestRecord).filter(TestRecord.id == record_id))
#     db_record = result.scalar_one_or_none()
    
#     if not db_record:
#         raise HTTPException(status_code=404, detail="Record not found")
    
#     # Cache the result for future requests
#     await redis_service.set(cache_key, db_record.to_dict(), expire=settings.REDIS_CACHE_TTL)
    
#     return TestRecordResponse(**db_record.to_dict())

# @app.get("/test", response_model=List[TestRecordResponse])
# async def get_all_test_records(db: AsyncSession = Depends(get_db)):
#     """Get all test records from PostgreSQL"""
    
#     from sqlalchemy import select
#     result = await db.execute(select(TestRecord))
#     records = result.scalars().all()
#     return [TestRecordResponse(**record.to_dict()) for record in records]

# School endpoints are now in the school_router.py file

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with basic information"""
    return {
        "message": "Welcome to Inkinki Smart School API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "create_test": "POST /test",
            "get_test": "GET /test/{record_id}",
            "get_all_tests": "GET /test",
            "school": {
                "get_all_schools": "GET /api/v1/school",
                "get_school_by_id": "GET /api/v1/school/{school_id}",
                "create_school": "POST /api/v1/school",
                "update_school": "PUT /api/v1/school/{school_id}",
                "soft_delete_school": "DELETE /api/v1/school/{school_id}",
                "activate_school": "PATCH /api/v1/school/{school_id}/activate",
                "deactivate_school": "PATCH /api/v1/school/{school_id}/deactivate"
            },
            "staff": {
                "get_all_staff": "GET /api/v1/staff?school_id={school_id}",
                "get_staff_by_id": "GET /api/v1/staff/{staff_id}?school_id={school_id}",
                "create_staff": "POST /api/v1/staff (requires school_id in body)",
                "update_staff": "PUT /api/v1/staff/{staff_id}?school_id={school_id}",
                "soft_delete_staff": "DELETE /api/v1/staff/{staff_id}?school_id={school_id}",
                "activate_staff": "PATCH /api/v1/staff/{staff_id}/activate?school_id={school_id}",
                "deactivate_staff": "PATCH /api/v1/staff/{staff_id}/deactivate?school_id={school_id}"
            },
            "teachers": {
                "get_all_teachers": "GET /api/v1/teachers?school_id={school_id} (with staff info, joined on staff)",
                "get_teacher_by_id": "GET /api/v1/teachers/{teacher_id}?school_id={school_id}",
                "create_teacher": "POST /api/v1/teachers?school_id={school_id}",
                "update_teacher": "PUT /api/v1/teachers/{teacher_id}?school_id={school_id}",
                "soft_delete_teacher": "DELETE /api/v1/teachers/{teacher_id}?school_id={school_id}",
                "activate_teacher": "PATCH /api/v1/teachers/{teacher_id}/activate?school_id={school_id}",
                "deactivate_teacher": "PATCH /api/v1/teachers/{teacher_id}/deactivate?school_id={school_id}"
            },
            "academic_years": {
                "get_all_academic_years": "GET /api/v1/academic-years?school_id={school_id}",
                "get_all_academic_years_all": "GET /api/v1/academic-years/all?school_id={school_id} (all years, current or not)",
                "get_current_academic_year": "GET /api/v1/academic-years/current?school_id={school_id}",
                "get_academic_year_by_id": "GET /api/v1/academic-years/{academic_id}?school_id={school_id}",
                "create_academic_year": "POST /api/v1/academic-years?school_id={school_id}",
                "update_academic_year": "PUT /api/v1/academic-years/{academic_id}?school_id={school_id}",
                "soft_delete_academic_year": "DELETE /api/v1/academic-years/{academic_id}?school_id={school_id}",
                "set_current_academic_year": "PATCH /api/v1/academic-years/{academic_id}/set-current?school_id={school_id}"
            },
            "classes": {
                "get_all_classes": "GET /api/v1/classes?school_id={school_id} (with manager info)",
                "get_class_by_id": "GET /api/v1/classes/{cls_id}?school_id={school_id}",
                "create_class": "POST /api/v1/classes?school_id={school_id}",
                "update_class": "PUT /api/v1/classes/{cls_id}?school_id={school_id}",
                "soft_delete_class": "DELETE /api/v1/classes/{cls_id}?school_id={school_id}"
            },
            "class_teachers": {
                "get_all_class_teachers": "GET /api/v1/class-teachers?school_id={school_id} (with details)",
                "get_class_teacher_by_id": "GET /api/v1/class-teachers/{assignment_id}?school_id={school_id}",
                "create_class_teacher": "POST /api/v1/class-teachers?school_id={school_id}",
                "update_class_teacher": "PUT /api/v1/class-teachers/{assignment_id}?school_id={school_id}",
                "soft_delete_class_teacher": "DELETE /api/v1/class-teachers/{assignment_id}?school_id={school_id}"
            },
            "subjects": {
                "get_all_subjects": "GET /api/v1/subjects?school_id={school_id}",
                "get_subject_by_id": "GET /api/v1/subjects/{subj_id}?school_id={school_id}",
                "create_subject": "POST /api/v1/subjects?school_id={school_id}",
                "update_subject": "PUT /api/v1/subjects/{subj_id}?school_id={school_id}",
                "soft_delete_subject": "DELETE /api/v1/subjects/{subj_id}?school_id={school_id}"
            },
            "attendance": {
                "get_all_attendance": "GET /api/v1/attendance?school_id={school_id} (with filtering options)",
                "get_attendance_by_id": "GET /api/v1/attendance/{attendance_id}?school_id={school_id}",
                "get_student_attendance": "GET /api/v1/attendance/student/{student_id}?school_id={school_id}",
                "get_attendance_summary": "GET /api/v1/attendance/summary/?school_id={school_id}",
                "create_attendance": "POST /api/v1/attendance",
                "create_bulk_attendance": "POST /api/v1/attendance/bulk",
                "update_attendance": "PUT /api/v1/attendance/{attendance_id}?school_id={school_id}",
                "soft_delete_attendance": "DELETE /api/v1/attendance/{attendance_id}?school_id={school_id}"
            },
            "auth": {
                "login": "POST /api/v1/auth/login",
                "reset_password": "POST /api/v1/auth/reset-password",
                "reset_password_confirm": "POST /api/v1/auth/reset-password/confirm",
                "change_password": "POST /api/v1/auth/change-password (requires Bearer token)",
                "get_current_user": "GET /api/v1/auth/me (requires Bearer token)"
            }
        }
    }
