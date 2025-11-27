import json
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID, uuid4
from models.logs import Log


class LogImportService:
    """Service to import logs from log files into the database"""
    
    def __init__(self, logs_dir: str = "logs"):
        self.logs_dir = Path(logs_dir)
    
    def parse_log_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Parse a log file and return list of log entries"""
        logs = []
        
        if not file_path.exists():
            return logs
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        log_entry = json.loads(line)
                        logs.append(log_entry)
                    except json.JSONDecodeError as e:
                        # Skip invalid JSON lines
                        continue
        except Exception as e:
            print(f"Error reading log file {file_path}: {str(e)}")
        
        return logs
    
    def map_file_log_to_db(self, file_log: Dict[str, Any]) -> Dict[str, Any]:
        """Map log file entry to database Log model structure"""
        # Extract data from file log
        timestamp_str = file_log.get('timestamp', '')
        level = file_log.get('level', '')
        action_icon = file_log.get('action', '')
        message = file_log.get('message', '')
        user_id = file_log.get('user_id')
        endpoint = file_log.get('endpoint')
        data = file_log.get('data', {})
        
        # Parse timestamp
        created_at = None
        if timestamp_str:
            try:
                created_at = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S.%f")
            except:
                try:
                    created_at = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
                except:
                    created_at = datetime.now()
        else:
            created_at = datetime.now()
        
        # Map level to status
        status = "SUCCESS"
        error_message = None
        if level == "❌" or "ERROR" in message.upper() or "FAILED" in message.upper():
            status = "ERROR"
            error_message = message
        elif level == "⚠️" or "WARNING" in message.upper():
            status = "WARNING"
        elif level == "✅":
            status = "SUCCESS"
        else:
            status = "INFO"
        
        # Extract action type from icon or message
        action = action_icon
        if "API Request" in message:
            action = "API_REQUEST"
        elif "API Response" in message:
            action = "API_RESPONSE"
        elif "Database" in message or "🗄️" in action_icon:
            action = "DATABASE_QUERY"
        elif "Cache" in message:
            action = "CACHE_OPERATION"
        elif "CREATE" in message.upper() or "➕" in action_icon:
            action = "CREATE"
        elif "UPDATE" in message.upper() or "✏️" in action_icon:
            action = "UPDATE"
        elif "DELETE" in message.upper() or "🗑️" in action_icon:
            action = "DELETE"
        elif "LOGIN" in message.upper() or "🔐" in action_icon:
            action = "LOGIN"
        else:
            action = action_icon or "UNKNOWN"
        
        # Extract table name from data or message
        table_name = None
        if 'table' in data:
            table_name = data['table']
        elif 'Database' in message and 'on' in message:
            # Extract table name from "Database SELECT on schools"
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
        
        # Extract IP address and user agent from data
        ip_address = data.get('client_ip') or data.get('ip_address')
        user_agent = data.get('user_agent')
        
        # Determine user_type from context
        user_type = None
        if user_id:
            # Try to determine from endpoint or context
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
        
        # Convert data to JSON string for old_values/new_values
        old_values = None
        new_values = None
        if data:
            # Store relevant data
            relevant_data = {
                'url': data.get('url'),
                'process_time': data.get('process_time'),
                'response_size': data.get('response_size'),
                'key': data.get('key'),
                'hit': data.get('hit'),
                'count': data.get('count'),
            }
            # Remove None values
            relevant_data = {k: v for k, v in relevant_data.items() if v is not None}
            if relevant_data:
                new_values = json.dumps(relevant_data)
        
        # Convert user_id to UUID if it's a string
        user_id_uuid = None
        if user_id:
            try:
                user_id_uuid = UUID(user_id)
            except:
                pass
        
        return {
            'log_id': uuid4(),
            'user_id': user_id_uuid,
            'user_type': user_type,
            'action': action,
            'message': message,  # Store the original message
            'table_name': table_name,
            'record_id': record_id,
            'old_values': old_values,
            'new_values': new_values,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'status': status,
            'error_message': error_message,
            'created_at': created_at
        }
    
    async def import_logs_from_file(self, db: AsyncSession, file_path: Path, limit: Optional[int] = None, errors_only: bool = True) -> int:
        """Import logs from a single file into the database. By default, only imports error logs."""
        file_logs = self.parse_log_file(file_path)
        
        # Filter for error logs only (default behavior)
        if errors_only:
            file_logs = [
                log for log in file_logs 
                if log.get('level') == '❌' or 'ERROR' in (log.get('message', '') or '').upper() or 'FAILED' in (log.get('message', '') or '').upper()
            ]
        
        if limit:
            file_logs = file_logs[:limit]
        
        imported_count = 0
        
        for file_log in file_logs:
            try:
                log_data = self.map_file_log_to_db(file_log)
                
                # Only import error logs (always enforce this)
                if log_data['status'] != 'ERROR':
                    continue
                
                # Check if log already exists (by timestamp and message)
                message_check = file_log.get('message', '')[:200] if 'message' in file_log else None
                if message_check:
                    # Use a time range check since timestamps might differ slightly
                    time_start = log_data['created_at']
                    time_end = log_data['created_at']
                    existing = await db.execute(
                        select(Log).filter(
                            Log.message == message_check,
                            Log.created_at >= time_start,
                            Log.created_at <= time_end
                        )
                    )
                    if existing.scalar_one_or_none():
                        continue  # Skip duplicates
                
                # Create new log entry
                log_entry = Log(**log_data)
                db.add(log_entry)
                imported_count += 1
                
            except Exception as e:
                print(f"Error importing log entry: {str(e)}")
                continue
        
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"Error committing logs: {str(e)}")
            return 0
        
        return imported_count
    
    async def import_all_logs(self, db: AsyncSession, limit_per_file: Optional[int] = None, errors_only: bool = True) -> Dict[str, Any]:
        """Import error logs from all log files in the logs directory. By default, only imports error logs."""
        if not self.logs_dir.exists():
            return {
                "success": False,
                "message": f"Logs directory not found: {self.logs_dir}",
                "imported": 0,
                "files_processed": 0
            }
        
        log_files = sorted(self.logs_dir.glob("app_*.log"), reverse=True)  # Most recent first
        
        total_imported = 0
        files_processed = 0
        
        for log_file in log_files:
            try:
                imported = await self.import_logs_from_file(db, log_file, limit_per_file, errors_only=errors_only)
                total_imported += imported
                files_processed += 1
            except Exception as e:
                print(f"Error processing file {log_file}: {str(e)}")
                continue
        
        return {
            "success": True,
            "message": f"Imported {total_imported} error logs from {files_processed} files",
            "imported": total_imported,
            "files_processed": files_processed
        }
    
    async def get_log_files_info(self) -> List[Dict[str, Any]]:
        """Get information about available log files"""
        if not self.logs_dir.exists():
            return []
        
        log_files = sorted(self.logs_dir.glob("app_*.log"), reverse=True)
        
        files_info = []
        for log_file in log_files:
            try:
                stat = log_file.stat()
                # Count lines in file
                line_count = 0
                with open(log_file, 'r', encoding='utf-8') as f:
                    line_count = sum(1 for _ in f)
                
                files_info.append({
                    "filename": log_file.name,
                    "path": str(log_file),
                    "size": stat.st_size,
                    "line_count": line_count,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
            except Exception as e:
                continue
        
        return files_info
    
    async def delete_all_logs_from_db(self, db: AsyncSession) -> int:
        """Delete all logs from the database"""
        try:
            from sqlalchemy import delete
            result = await db.execute(delete(Log))
            await db.commit()
            return result.rowcount
        except Exception as e:
            await db.rollback()
            print(f"Error deleting logs from database: {str(e)}")
            raise
    
    def delete_old_log_files(self, keep_today_only: bool = True) -> Dict[str, Any]:
        """Delete old log files, keeping only today's file"""
        if not self.logs_dir.exists():
            return {
                "success": False,
                "message": f"Logs directory not found: {self.logs_dir}",
                "deleted": 0
            }
        
        today = datetime.now().strftime("%Y-%m-%d")
        today_file = self.logs_dir / f"app_{today}.log"
        
        deleted_files = []
        deleted_count = 0
        
        for log_file in self.logs_dir.glob("app_*.log"):
            try:
                if keep_today_only and log_file == today_file:
                    continue  # Keep today's file
                
                log_file.unlink()
                deleted_files.append(log_file.name)
                deleted_count += 1
            except Exception as e:
                print(f"Error deleting file {log_file}: {str(e)}")
                continue
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} log files, kept today's file",
            "deleted": deleted_count,
            "deleted_files": deleted_files,
            "kept_file": today_file.name if today_file.exists() else None
        }
    
    async def import_error_logs_from_today(self, db: AsyncSession) -> Dict[str, Any]:
        """Import only error logs from today's log file"""
        today = datetime.now().strftime("%Y-%m-%d")
        today_file = self.logs_dir / f"app_{today}.log"
        
        if not today_file.exists():
            return {
                "success": False,
                "message": f"Today's log file not found: {today_file}",
                "imported": 0
            }
        
        try:
            imported = await self.import_logs_from_file(db, today_file, errors_only=True)
            return {
                "success": True,
                "message": f"Imported {imported} error logs from today's file",
                "imported": imported,
                "file": today_file.name
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error importing logs: {str(e)}",
                "imported": 0
            }

