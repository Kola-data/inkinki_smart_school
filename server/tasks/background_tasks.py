from celery_app import celery_app
from services.logging_service import logging_service, LogLevel, ActionType
import asyncio
from datetime import datetime

@celery_app.task
def log_async_operation(level: str, action: str, message: str, data: dict = None, user_id: str = None, endpoint: str = None):
    """Background task to handle async logging operations"""
    try:
        # Convert string enums to actual enum values
        level_enum = LogLevel(level) if hasattr(LogLevel, level) else LogLevel.INFO
        action_enum = ActionType(action) if hasattr(ActionType, action) else ActionType.BACKGROUND_TASK
        
        # Create new event loop for this task
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def log_operation():
            await logging_service.log_async(
                level=level_enum,
                action=action_enum,
                message=message,
                data=data,
                user_id=user_id,
                endpoint=endpoint
            )
        
        loop.run_until_complete(log_operation())
        loop.close()
        
        return {"status": "success", "message": "Log entry created"}
        
    except Exception as exc:
        return {"status": "error", "error": str(exc)}

@celery_app.task
def process_api_logs(api_data: dict):
    """Background task to process API logs"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def process_logs():
            # Log API request
            await logging_service.log_api_request(
                method=api_data.get("method", "GET"),
                endpoint=api_data.get("endpoint", "/"),
                user_id=api_data.get("user_id"),
                data=api_data.get("request_data")
            )
            
            # Log API response
            await logging_service.log_api_response(
                method=api_data.get("method", "GET"),
                endpoint=api_data.get("endpoint", "/"),
                status_code=api_data.get("status_code", 200),
                user_id=api_data.get("user_id"),
                data=api_data.get("response_data")
            )
        
        loop.run_until_complete(process_logs())
        loop.close()
        
        return {"status": "success", "message": "API logs processed"}
        
    except Exception as exc:
        return {"status": "error", "error": str(exc)}

@celery_app.task
def process_database_logs(db_data: dict):
    """Background task to process database operation logs"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def process_logs():
            await logging_service.log_database_operation(
                operation=db_data.get("operation", "query"),
                table=db_data.get("table", "unknown"),
                record_id=db_data.get("record_id"),
                user_id=db_data.get("user_id"),
                data=db_data.get("data")
            )
        
        loop.run_until_complete(process_logs())
        loop.close()
        
        return {"status": "success", "message": "Database logs processed"}
        
    except Exception as exc:
        return {"status": "error", "error": str(exc)}

@celery_app.task
def process_cache_logs(cache_data: dict):
    """Background task to process cache operation logs"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def process_logs():
            await logging_service.log_cache_operation(
                operation=cache_data.get("operation", "get"),
                key=cache_data.get("key", "unknown"),
                hit=cache_data.get("hit", True),
                user_id=cache_data.get("user_id")
            )
        
        loop.run_until_complete(process_logs())
        loop.close()
        
        return {"status": "success", "message": "Cache logs processed"}
        
    except Exception as exc:
        return {"status": "error", "error": str(exc)}
