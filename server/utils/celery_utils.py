"""Utility functions for safely calling Celery tasks when Redis might not be available"""
from typing import Any, Callable, Optional
import logging

logger = logging.getLogger(__name__)

def safe_celery_call(celery_task: Callable, *args, **kwargs) -> Optional[Any]:
    """
    Safely call a Celery task, catching Redis connection errors.
    Returns None if the task cannot be queued (e.g., Redis is not available).
    """
    try:
        return celery_task.delay(*args, **kwargs)
    except Exception as e:
        # Silently fail if Celery/Redis is not available
        # This allows the API to work without Redis/Celery
        logger.debug(f"Celery task {celery_task.name} could not be queued: {e}")
        return None


