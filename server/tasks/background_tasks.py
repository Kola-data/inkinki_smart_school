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

@celery_app.task
def insert_error_log_to_db(log_data: dict):
    """Background task to insert error logs into the database"""
    try:
        from database import AsyncSessionLocal
        from models.logs import Log
        from sqlalchemy import select
        from uuid import UUID, uuid4
        import json
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def insert_log():
            async with AsyncSessionLocal() as db:
                try:
                    # Extract data from log_data
                    message = log_data.get("message", "")
                    action = log_data.get("action", "ERROR")
                    user_id = log_data.get("user_id")
                    endpoint = log_data.get("endpoint")
                    data = log_data.get("data", {})
                    created_at = datetime.now()
                    
                    # Extract table name
                    table_name = None
                    if 'table' in data:
                        table_name = data['table']
                    elif 'Database' in message and 'on' in message:
                        parts = message.split(' on ')
                        if len(parts) > 1:
                            table_name = parts[1].strip()
                    
                    # Extract record_id
                    record_id = None
                    if 'record_id' in data and data['record_id']:
                        try:
                            record_id = UUID(data['record_id'])
                        except:
                            pass
                    
                    # Extract IP and user agent
                    ip_address = data.get('client_ip') or data.get('ip_address')
                    user_agent = data.get('user_agent')
                    
                    # Determine user_type
                    user_type = None
                    if user_id:
                        if 'staff' in (endpoint or '').lower():
                            user_type = 'staff'
                        elif 'teacher' in (endpoint or '').lower():
                            user_type = 'teacher'
                        elif 'student' in (endpoint or '').lower():
                            user_type = 'student'
                        elif 'system' in (endpoint or '').lower():
                            user_type = 'admin'
                        else:
                            user_type = 'admin'
                    
                    # Convert user_id to UUID
                    user_id_uuid = None
                    if user_id:
                        try:
                            user_id_uuid = UUID(user_id)
                        except:
                            pass
                    
                    # Store relevant data
                    new_values = None
                    if data:
                        relevant_data = {
                            'url': data.get('url'),
                            'process_time': data.get('process_time'),
                            'response_size': data.get('response_size'),
                            'error_type': data.get('error_type'),
                            'context': data.get('context'),
                        }
                        relevant_data = {k: v for k, v in relevant_data.items() if v is not None}
                        if relevant_data:
                            new_values = json.dumps(relevant_data)
                    
                    # Check for duplicates (within same second)
                    existing = await db.execute(
                        select(Log).filter(
                            Log.message == message[:500],
                            Log.created_at >= created_at.replace(microsecond=0),
                            Log.status == "ERROR"
                        )
                    )
                    if existing.scalar_one_or_none():
                        return  # Skip duplicates
                    
                    # Create log entry
                    log_entry = Log(
                        log_id=uuid4(),
                        user_id=user_id_uuid,
                        user_type=user_type,
                        action=action,
                        message=message,
                        table_name=table_name,
                        record_id=record_id,
                        old_values=None,
                        new_values=new_values,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        status="ERROR",
                        error_message=message,
                        created_at=created_at
                    )
                    
                    db.add(log_entry)
                    await db.commit()
                    
                except Exception as e:
                    await db.rollback()
                    print(f"Error inserting error log to database: {str(e)}")
        
        loop.run_until_complete(insert_log())
        loop.close()
        
        return {"status": "success", "message": "Error log inserted to database"}
        
    except Exception as exc:
        return {"status": "error", "error": str(exc)}
