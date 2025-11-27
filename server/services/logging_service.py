import os
import json
from datetime import datetime, date
from typing import Dict, Any, Optional
from enum import Enum
import asyncio
from pathlib import Path
from uuid import UUID, uuid4

class LogLevel(Enum):
    """Log levels with corresponding icons"""
    SUCCESS = "✅"
    ERROR = "❌"
    WARNING = "⚠️"
    INFO = "ℹ️"
    DEBUG = "🐛"
    CRITICAL = "🚨"

class ActionType(Enum):
    """Action types with corresponding icons"""
    CREATE = "➕"
    READ = "👁️"
    UPDATE = "✏️"
    DELETE = "🗑️"
    LOGIN = "🔐"
    LOGOUT = "🚪"
    LOGIN_SUCCESS = "🔓"
    LOGIN_FAILED = "🔒"
    LOGIN_ERROR = "🔑"
    ACTIVATE = "🟢"
    DEACTIVATE = "🔴"
    CACHE_HIT = "💾"
    CACHE_MISS = "💿"
    DATABASE_QUERY = "🗄️"
    PASSWORD_RESET_REQUEST = "🔄"
    PASSWORD_RESET_CONFIRM = "🔐"
    PASSWORD_RESET_ERROR = "❌"
    PASSWORD_CHANGE_SUCCESS = "🔑"
    PASSWORD_CHANGE_FAILED = "🔒"
    PASSWORD_CHANGE_ERROR = "❌"
    TOKEN_VERIFICATION_ERROR = "🔍"
    API_REQUEST = "🌐"
    API_RESPONSE = "📡"
    BACKGROUND_TASK = "⚙️"
    FILE_OPERATION = "📁"
    EMAIL_SEND = "📧"
    SMS_SEND = "📱"

class LoggingService:
    """Service for managing application logs with date-based files and icons"""
    
    def __init__(self, logs_dir: str = "logs"):
        self.logs_dir = Path(logs_dir)
        self.logs_dir.mkdir(exist_ok=True)
        
    def _get_log_file_path(self, log_type: str = "app") -> Path:
        """Get the log file path for today's date"""
        today = date.today().strftime("%Y-%m-%d")
        return self.logs_dir / f"{log_type}_{today}.log"
    
    def _format_log_entry(self, 
                         level: LogLevel, 
                         action: ActionType, 
                         message: str, 
                         data: Optional[Dict[str, Any]] = None,
                         user_id: Optional[str] = None,
                         endpoint: Optional[str] = None) -> str:
        """Format a log entry with timestamp and icons"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        
        log_entry = {
            "timestamp": timestamp,
            "level": level.value,
            "action": action.value,
            "message": message,
            "user_id": user_id,
            "endpoint": endpoint,
            "data": data or {}
        }
        
        return json.dumps(log_entry, ensure_ascii=False) + "\n"
    
    async def log_async(self, 
                       level: LogLevel, 
                       action: ActionType, 
                       message: str, 
                       data: Optional[Dict[str, Any]] = None,
                       user_id: Optional[str] = None,
                       endpoint: Optional[str] = None,
                       log_type: str = "app") -> None:
        """Async method to log an entry"""
        log_entry = self._format_log_entry(level, action, message, data, user_id, endpoint)
        log_file = self._get_log_file_path(log_type)
        
        # Always write to file (existing behavior)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._write_to_file, log_file, log_entry)
        
        # If it's an error log, also insert into database
        if level == LogLevel.ERROR:
            asyncio.create_task(self._insert_error_log_to_db(level, action, message, data, user_id, endpoint))
    
    def _write_to_file(self, log_file: Path, log_entry: str) -> None:
        """Write log entry to file (synchronous)"""
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(log_entry)
    
    def log_sync(self, 
                level: LogLevel, 
                action: ActionType, 
                message: str, 
                data: Optional[Dict[str, Any]] = None,
                user_id: Optional[str] = None,
                endpoint: Optional[str] = None,
                log_type: str = "app") -> None:
        """Synchronous method to log an entry"""
        log_entry = self._format_log_entry(level, action, message, data, user_id, endpoint)
        log_file = self._get_log_file_path(log_type)
        
        # Always write to file (existing behavior)
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(log_entry)
        
        # If it's an error log, also insert into database (async, non-blocking)
        if level == LogLevel.ERROR:
            asyncio.create_task(self._insert_error_log_to_db(level, action, message, data, user_id, endpoint))
    
    async def log_api_request(self, 
                             method: str, 
                             endpoint: str, 
                             user_id: Optional[str] = None,
                             data: Optional[Dict[str, Any]] = None) -> None:
        """Log API request"""
        await self.log_async(
            LogLevel.INFO,
            ActionType.API_REQUEST,
            f"API Request: {method} {endpoint}",
            data,
            user_id,
            endpoint
        )
    
    async def log_api_response(self, 
                              method: str, 
                              endpoint: str, 
                              status_code: int,
                              user_id: Optional[str] = None,
                              data: Optional[Dict[str, Any]] = None) -> None:
        """Log API response"""
        level = LogLevel.SUCCESS if 200 <= status_code < 300 else LogLevel.ERROR
        await self.log_async(
            level,
            ActionType.API_RESPONSE,
            f"API Response: {method} {endpoint} - Status: {status_code}",
            data,
            user_id,
            endpoint
        )
    
    async def log_database_operation(self, 
                                   operation: str, 
                                   table: str,
                                   record_id: Optional[str] = None,
                                   user_id: Optional[str] = None,
                                   data: Optional[Dict[str, Any]] = None) -> None:
        """Log database operation"""
        await self.log_async(
            LogLevel.INFO,
            ActionType.DATABASE_QUERY,
            f"Database {operation} on {table}",
            {"record_id": record_id, "table": table, **data} if data else {"record_id": record_id, "table": table},
            user_id
        )
    
    async def log_cache_operation(self, 
                                 operation: str, 
                                 key: str,
                                 hit: bool = True,
                                 user_id: Optional[str] = None) -> None:
        """Log cache operation"""
        action = ActionType.CACHE_HIT if hit else ActionType.CACHE_MISS
        await self.log_async(
            LogLevel.INFO,
            action,
            f"Cache {operation}: {key}",
            {"key": key, "hit": hit},
            user_id
        )
    
    async def log_crud_operation(self, 
                                operation: ActionType, 
                                entity: str, 
                                entity_id: Optional[str] = None,
                                user_id: Optional[str] = None,
                                data: Optional[Dict[str, Any]] = None) -> None:
        """Log CRUD operation"""
        level = LogLevel.SUCCESS if operation in [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] else LogLevel.INFO
        await self.log_async(
            level,
            operation,
            f"{operation.name} {entity}",
            {"entity": entity, "entity_id": entity_id, **data} if data else {"entity": entity, "entity_id": entity_id},
            user_id
        )
    
    async def log_error(self, 
                       error: Exception, 
                       context: str,
                       user_id: Optional[str] = None,
                       endpoint: Optional[str] = None,
                       data: Optional[Dict[str, Any]] = None) -> None:
        """Log error with context"""
        await self.log_async(
            LogLevel.ERROR,
            ActionType.BACKGROUND_TASK,
            f"Error in {context}: {str(error)}",
            {"error_type": type(error).__name__, "context": context, **data} if data else {"error_type": type(error).__name__, "context": context},
            user_id,
            endpoint
        )
    
    async def log_background_task(self, 
                                 task_name: str, 
                                 status: str,
                                 user_id: Optional[str] = None,
                                 data: Optional[Dict[str, Any]] = None) -> None:
        """Log background task execution"""
        level = LogLevel.SUCCESS if status == "completed" else LogLevel.ERROR
        await self.log_async(
            level,
            ActionType.BACKGROUND_TASK,
            f"Background task {task_name}: {status}",
            {"task_name": task_name, "status": status, **data} if data else {"task_name": task_name, "status": status},
            user_id
        )
    
    async def _insert_error_log_to_db(self,
                                     level: LogLevel,
                                     action: ActionType,
                                     message: str,
                                     data: Optional[Dict[str, Any]] = None,
                                     user_id: Optional[str] = None,
                                     endpoint: Optional[str] = None) -> None:
        """Insert error log into database using background task (non-blocking)"""
        try:
            from tasks.background_tasks import insert_error_log_to_db
            from utils.celery_utils import safe_celery_call
            
            # Map action icon to action string
            action_str = action.value
            if "API Request" in message:
                action_str = "API_REQUEST"
            elif "API Response" in message:
                action_str = "API_RESPONSE"
            elif "Database" in message or "🗄️" in action.value:
                action_str = "DATABASE_QUERY"
            elif "Cache" in message:
                action_str = "CACHE_OPERATION"
            else:
                action_str = action.value or "ERROR"
            
            # Call background task to insert error log
            safe_celery_call(
                insert_error_log_to_db,
                {
                    "message": message,
                    "action": action_str,
                    "user_id": user_id,
                    "endpoint": endpoint,
                    "data": data or {}
                }
            )
        except Exception as e:
            # Silently fail - don't break logging if background task fails
            # File logging will still work
            pass

# Global logging service instance
logging_service = LoggingService()
