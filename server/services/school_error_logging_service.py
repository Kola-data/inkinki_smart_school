"""
Service for automatically logging errors from school endpoints to the database.
Errors are automatically marked as read and use the actual error time.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from uuid import UUID, uuid4
import json
from models.logs import Log
from database import AsyncSessionLocal


class SchoolErrorLoggingService:
    """Service for logging errors from school endpoints"""
    
    @staticmethod
    async def log_school_endpoint_error(
        error: Exception,
        endpoint: str,
        method: str,
        error_time: Optional[datetime] = None,
        user_id: Optional[str] = None,
        school_id: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        db: Optional[AsyncSession] = None
    ) -> None:
        """
        Log an error from a school endpoint to the database.
        Errors are automatically marked as read and use the actual error time.
        
        Args:
            error: The exception that occurred
            endpoint: The API endpoint where the error occurred
            method: HTTP method (GET, POST, etc.)
            error_time: The actual time the error occurred (defaults to now)
            user_id: Optional user ID
            school_id: Optional school ID
            request_data: Optional request data
            client_ip: Optional client IP address
            user_agent: Optional user agent
            db: Optional database session (creates new if not provided)
        """
        # Use provided error time or current time
        if error_time is None:
            error_time = datetime.now()
        
        # Check if this is a school endpoint
        if not endpoint.startswith('/api/v1/school'):
            return  # Only log school endpoint errors
        
        # Use provided db session or create new one
        should_close = False
        if db is None:
            db = AsyncSessionLocal()
            should_close = True
        
        try:
            # Extract error details
            error_message = str(error)
            error_type = type(error).__name__
            
            # Build message
            message = f"Error in {method} {endpoint}: {error_message}"
            
            # Extract table name if available
            table_name = None
            if hasattr(error, 'table') and error.table:
                table_name = error.table
            
            # Extract record_id if available
            record_id = None
            if request_data and 'id' in request_data:
                try:
                    record_id = UUID(request_data['id'])
                except:
                    pass
            
            # Convert user_id to UUID
            user_id_uuid = None
            if user_id:
                try:
                    user_id_uuid = UUID(user_id)
                except:
                    pass
            
            # Build new_values JSON
            new_values = {
                'endpoint': endpoint,
                'method': method,
                'error_type': error_type,
                'school_id': school_id,
            }
            if request_data:
                new_values['request_data'] = request_data
            if client_ip:
                new_values['client_ip'] = client_ip
            if user_agent:
                new_values['user_agent'] = user_agent
            
            # Check for duplicates (within same second)
            existing = await db.execute(
                select(Log).filter(
                    Log.message == message[:500],
                    Log.created_at >= error_time.replace(microsecond=0),
                    Log.status == "ERROR",
                    Log.is_read == True  # Only check read logs for duplicates
                )
            )
            if existing.scalar_one_or_none():
                return  # Skip duplicates
            
            # Create log entry - marked as read and using actual error time
            log_entry = Log(
                log_id=uuid4(),
                user_id=user_id_uuid,
                user_type='admin',  # School endpoints are admin-level
                action=f"{method}_ERROR",
                message=message,
                table_name=table_name,
                record_id=record_id,
                old_values=None,
                new_values=json.dumps(new_values),
                ip_address=client_ip,
                user_agent=user_agent,
                status="ERROR",
                error_message=error_message,
                is_fixed=False,
                is_read=True,  # Automatically mark as read
                created_at=error_time  # Use actual error time, not insertion time
            )
            
            db.add(log_entry)
            await db.commit()
            
        except Exception as e:
            await db.rollback()
            # Don't raise - we don't want error logging to break the app
            print(f"Error logging school endpoint error to database: {str(e)}")
        finally:
            if should_close:
                await db.close()
    
    @staticmethod
    async def delete_read_errors(db: Optional[AsyncSession] = None) -> int:
        """
        Delete all read errors from the database.
        
        Args:
            db: Optional database session (creates new if not provided)
            
        Returns:
            Number of deleted logs
        """
        should_close = False
        if db is None:
            db = AsyncSessionLocal()
            should_close = True
        
        try:
            # Delete all read errors using a delete statement
            delete_stmt = delete(Log).filter(
                Log.is_read == True,
                Log.status == "ERROR"
            )
            result = await db.execute(delete_stmt)
            count = result.rowcount
            
            await db.commit()
            return count
            
        except Exception as e:
            await db.rollback()
            raise e
        finally:
            if should_close:
                await db.close()


# Global service instance
school_error_logging_service = SchoolErrorLoggingService()

