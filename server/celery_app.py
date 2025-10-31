from celery import Celery
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType

# Create Celery app
celery_app = Celery(
    "inkinki_smart_school",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=['tasks.background_tasks']
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

@celery_app.task(bind=True)
def log_background_task(self, task_name: str, data: dict = None):
    """Background task for logging operations"""
    try:
        # This will be handled by the logging service
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def log_task():
            await logging_service.log_background_task(
                task_name=task_name,
                status="started",
                data=data
            )
            
            # Simulate some work
            import time
            time.sleep(1)
            
            await logging_service.log_background_task(
                task_name=task_name,
                status="completed",
                data=data
            )
        
        loop.run_until_complete(log_task())
        loop.close()
        
        return {"status": "completed", "task_name": task_name}
        
    except Exception as exc:
        # Log the error
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def log_error():
            await logging_service.log_error(
                error=exc,
                context=f"Background task: {task_name}",
                data=data
            )
        
        loop.run_until_complete(log_error())
        loop.close()
        
        raise self.retry(exc=exc, countdown=60, max_retries=3)

@celery_app.task
def cleanup_old_logs(days_to_keep: int = 30):
    """Background task to cleanup old log files"""
    import os
    from datetime import datetime, timedelta
    from pathlib import Path
    
    try:
        logs_dir = Path("logs")
        if not logs_dir.exists():
            return {"status": "no_logs_dir"}
        
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        deleted_files = []
        
        for log_file in logs_dir.glob("*.log"):
            if log_file.stat().st_mtime < cutoff_date.timestamp():
                log_file.unlink()
                deleted_files.append(str(log_file))
        
        return {
            "status": "completed",
            "deleted_files": deleted_files,
            "count": len(deleted_files)
        }
        
    except Exception as exc:
        return {"status": "error", "error": str(exc)}

@celery_app.task
def generate_daily_report(date_str: str = None):
    """Background task to generate daily activity report"""
    from datetime import datetime, date
    import json
    from pathlib import Path
    
    try:
        if not date_str:
            date_str = date.today().strftime("%Y-%m-%d")
        
        logs_dir = Path("logs")
        log_file = logs_dir / f"app_{date_str}.log"
        
        if not log_file.exists():
            return {"status": "no_log_file", "date": date_str}
        
        # Read and analyze log file
        stats = {
            "date": date_str,
            "total_entries": 0,
            "by_level": {},
            "by_action": {},
            "by_endpoint": {},
            "errors": [],
            "success_operations": 0,
            "api_requests": 0,
            "database_operations": 0
        }
        
        with open(log_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    stats["total_entries"] += 1
                    
                    # Count by level
                    level = entry.get("level", "unknown")
                    stats["by_level"][level] = stats["by_level"].get(level, 0) + 1
                    
                    # Count by action
                    action = entry.get("action", "unknown")
                    stats["by_action"][action] = stats["by_action"].get(action, 0) + 1
                    
                    # Count by endpoint
                    endpoint = entry.get("endpoint", "unknown")
                    if endpoint != "unknown":
                        stats["by_endpoint"][endpoint] = stats["by_endpoint"].get(endpoint, 0) + 1
                    
                    # Track specific operations
                    if "API Request" in entry.get("message", ""):
                        stats["api_requests"] += 1
                    elif "Database" in entry.get("message", ""):
                        stats["database_operations"] += 1
                    elif level == "✅":
                        stats["success_operations"] += 1
                    elif level == "❌":
                        stats["errors"].append(entry)
                        
                except json.JSONDecodeError:
                    continue
        
        # Save report
        report_file = logs_dir / f"report_{date_str}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
        
        return {
            "status": "completed",
            "date": date_str,
            "report_file": str(report_file),
            "stats": stats
        }
        
    except Exception as exc:
        return {"status": "error", "error": str(exc)}
