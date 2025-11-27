from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update, delete, or_
from database import get_db
from models.school import School
from models.logs import Log
from models.fee_invoice import FeeInvoice
from models.system_user import SystemUser
from services.log_import_service import LogImportService
from utils.pagination import paginate_query, calculate_total_pages
from utils.auth_dependencies import get_current_system_user
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
from uuid import UUID

router = APIRouter(prefix="/system-analytics", tags=["System Analytics"])

class SystemAnalyticsResponse(BaseModel):
    schools: Dict[str, Any]
    logs: Dict[str, Any]
    payments: Dict[str, Any]

class LogIdsRequest(BaseModel):
    log_ids: List[str]

@router.get("/", response_model=SystemAnalyticsResponse)
async def get_system_analytics(
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Get system-wide analytics"""
    try:
        # Schools Analytics
        total_schools_result = await db.execute(
            select(func.count(School.school_id)).filter(School.is_deleted == False)
        )
        total_schools = total_schools_result.scalar() or 0
        
        active_schools_result = await db.execute(
            select(func.count(School.school_id)).filter(
                and_(School.is_deleted == False, School.is_active == True)
            )
        )
        active_schools = active_schools_result.scalar() or 0
        
        inactive_schools = total_schools - active_schools
        
        # New schools (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        new_schools_result = await db.execute(
            select(func.count(School.school_id)).filter(
                and_(
                    School.is_deleted == False,
                    School.created_at >= thirty_days_ago
                )
            )
        )
        new_schools = new_schools_result.scalar() or 0
        
        # Logs Analytics
        total_logs_result = await db.execute(
            select(func.count(Log.log_id))
        )
        total_logs = total_logs_result.scalar() or 0
        
        # Error logs (using status field instead of level)
        error_logs_result = await db.execute(
            select(func.count(Log.log_id)).filter(Log.status == "ERROR")
        )
        error_logs = error_logs_result.scalar() or 0
        
        # Unread logs (assuming unread means recent logs without read flag)
        # For now, we'll count logs from last 24 hours as "unread"
        twenty_four_hours_ago = datetime.now() - timedelta(hours=24)
        unread_logs_result = await db.execute(
            select(func.count(Log.log_id)).filter(Log.created_at >= twenty_four_hours_ago)
        )
        unread_logs = unread_logs_result.scalar() or 0
        
        # Payments Analytics
        total_payments_result = await db.execute(
            select(func.count(FeeInvoice.invoice_id)).filter(FeeInvoice.is_deleted == False)
        )
        total_payments = total_payments_result.scalar() or 0
        
        total_amount_result = await db.execute(
            select(func.sum(FeeInvoice.amount)).filter(FeeInvoice.is_deleted == False)
        )
        total_amount = float(total_amount_result.scalar() or 0)
        
        # For now, all non-deleted invoices are considered completed
        # You can add payment status field later if needed
        completed_payments = total_payments
        pending_payments = 0
        
        payments_data = {
            "total_payments": total_payments,
            "pending_payments": pending_payments,
            "completed_payments": completed_payments,
            "total_amount": total_amount
        }
        
        return SystemAnalyticsResponse(
            schools={
                "total": total_schools,
                "active": active_schools,
                "inactive": inactive_schools,
                "new_last_30_days": new_schools
            },
            logs={
                "total": total_logs,
                "errors": error_logs,
                "unread": unread_logs
            },
            payments=payments_data
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving analytics: {str(e)}"
        )

@router.get("/schools", response_model=Dict[str, Any])
async def get_schools_analytics(
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed schools analytics"""
    try:
        # Get all schools with details
        result = await db.execute(
            select(School).filter(School.is_deleted == False).order_by(School.created_at.desc())
        )
        schools = result.scalars().all()
        
        schools_list = [school.to_dict() for school in schools]
        
        return {
            "schools": schools_list,
            "summary": {
                "total": len(schools_list),
                "active": sum(1 for s in schools_list if s.get("is_active")),
                "inactive": sum(1 for s in schools_list if not s.get("is_active"))
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving schools: {str(e)}"
        )

@router.get("/logs", response_model=Dict[str, Any])
async def get_logs_analytics(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Number of items per page (max 100)"),
    status: str = None,
    is_fixed: Optional[bool] = None,
    action: Optional[str] = None,
    search: Optional[str] = None,
    import_from_files: bool = False,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Get logs with filtering and pagination. Optionally import from log files first."""
    try:
        # Optionally import logs from files before fetching
        if import_from_files:
            import_service = LogImportService()
            import_result = await import_service.import_all_logs(db, limit_per_file=1000)
            # Log the import result (optional)
        
        query = select(Log)
        
        # Apply filters
        if status:
            query = query.filter(Log.status == status.upper())
        
        if is_fixed is not None:
            query = query.filter(Log.is_fixed == is_fixed)
        
        if action:
            query = query.filter(Log.action.ilike(f"%{action}%"))
        
        if search:
            query = query.filter(
                or_(
                    Log.message.ilike(f"%{search}%"),
                    Log.error_message.ilike(f"%{search}%"),
                    Log.action.ilike(f"%{search}%"),
                    Log.table_name.ilike(f"%{search}%")
                )
            )
        
        query = query.order_by(Log.created_at.desc())
        
        # Apply pagination
        logs, total = await paginate_query(db, query, page=page, page_size=page_size)
        
        logs_list = [log.to_dict() for log in logs]
        
        return {
            "logs": logs_list,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": calculate_total_pages(total, page_size),
            "errors": sum(1 for log in logs_list if log.get("status") == "ERROR")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving logs: {str(e)}"
        )

@router.post("/logs/import", response_model=Dict[str, Any])
async def import_logs_from_files(
    limit_per_file: Optional[int] = None,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Import logs from log files into the database"""
    try:
        import_service = LogImportService()
        result = await import_service.import_all_logs(db, limit_per_file=limit_per_file)
        
        return {
            "success": result["success"],
            "message": result["message"],
            "imported": result["imported"],
            "files_processed": result["files_processed"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing logs: {str(e)}"
        )

@router.post("/logs/cleanup-and-import-errors", response_model=Dict[str, Any])
async def cleanup_and_import_error_logs(
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete all logs from DB, delete old log files (keep only today's), and import only error logs from today"""
    try:
        import_service = LogImportService()
        
        # Step 1: Delete all logs from database
        deleted_count = await import_service.delete_all_logs_from_db(db)
        
        # Step 2: Delete old log files (keep only today's)
        cleanup_result = import_service.delete_old_log_files(keep_today_only=True)
        
        # Step 3: Import only error logs from today's file
        import_result = await import_service.import_error_logs_from_today(db)
        
        return {
            "success": True,
            "message": "Cleanup and import completed",
            "database": {
                "deleted": deleted_count
            },
            "files": {
                "deleted": cleanup_result["deleted"],
                "kept": cleanup_result["kept_file"]
            },
            "imported": {
                "count": import_result["imported"],
                "file": import_result.get("file")
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during cleanup and import: {str(e)}"
        )

@router.delete("/logs/all", response_model=Dict[str, Any])
async def delete_all_logs(
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete all logs from the database"""
    try:
        import_service = LogImportService()
        deleted_count = await import_service.delete_all_logs_from_db(db)
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} logs from database",
            "deleted": deleted_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting logs: {str(e)}"
        )

@router.delete("/logs/read-errors", response_model=Dict[str, Any])
async def delete_read_errors(
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete all read errors from the database"""
    try:
        from services.school_error_logging_service import school_error_logging_service
        deleted_count = await school_error_logging_service.delete_read_errors(db)
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} read errors from database",
            "deleted": deleted_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting read errors: {str(e)}"
        )

@router.delete("/logs/files", response_model=Dict[str, Any])
async def cleanup_log_files(
    keep_today_only: bool = True,
    current_system_user: SystemUser = Depends(get_current_system_user)
):
    """Delete old log files, keeping only today's file"""
    try:
        import_service = LogImportService()
        result = import_service.delete_old_log_files(keep_today_only=keep_today_only)
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cleaning up log files: {str(e)}"
        )

@router.get("/logs/files", response_model=Dict[str, Any])
async def get_log_files_info(
    current_system_user: SystemUser = Depends(get_current_system_user)
):
    """Get information about available log files"""
    try:
        import_service = LogImportService()
        files_info = await import_service.get_log_files_info()
        
        return {
            "files": files_info,
            "total_files": len(files_info),
            "total_lines": sum(f.get("line_count", 0) for f in files_info)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving log files info: {str(e)}"
        )

@router.patch("/logs/mark-fixed", response_model=Dict[str, Any])
async def mark_logs_as_fixed(
    request: LogIdsRequest,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark one or more logs as fixed/resolved"""
    try:
        log_ids = request.log_ids
        if not log_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No log IDs provided"
            )
        
        # Convert string IDs to UUIDs
        uuid_ids = []
        for log_id in log_ids:
            try:
                uuid_ids.append(UUID(log_id))
            except ValueError:
                continue
        
        if not uuid_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid log ID format"
            )
        
        # Update logs
        result = await db.execute(
            update(Log)
            .where(Log.log_id.in_(uuid_ids))
            .values(is_fixed=True)
        )
        await db.commit()
        
        return {
            "success": True,
            "message": f"Marked {result.rowcount} log(s) as fixed",
            "updated": result.rowcount
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marking logs as fixed: {str(e)}"
        )

@router.post("/logs/delete", response_model=Dict[str, Any])
async def delete_logs(
    request: LogIdsRequest,
    current_system_user: SystemUser = Depends(get_current_system_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete one or more logs"""
    try:
        log_ids = request.log_ids
        if not log_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No log IDs provided"
            )
        
        # Convert string IDs to UUIDs
        uuid_ids = []
        for log_id in log_ids:
            try:
                uuid_ids.append(UUID(log_id))
            except ValueError:
                continue
        
        if not uuid_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid log ID format"
            )
        
        # Delete logs
        result = await db.execute(
            delete(Log).where(Log.log_id.in_(uuid_ids))
        )
        await db.commit()
        
        return {
            "success": True,
            "message": f"Deleted {result.rowcount} log(s)",
            "deleted": result.rowcount
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting logs: {str(e)}"
        )

