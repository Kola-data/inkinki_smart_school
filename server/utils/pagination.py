"""Pagination utilities for API endpoints"""
from typing import TypeVar, Generic, List, Tuple
from sqlalchemy import select, func as sql_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select
import math

T = TypeVar('T')

class PaginationParams:
    """Pagination parameters"""
    def __init__(self, page: int = 1, page_size: int = 50):
        self.page = max(1, page)
        self.page_size = min(max(1, page_size), 100)  # Max 100 items per page
        self.offset = (self.page - 1) * self.page_size
        self.limit = self.page_size

async def paginate_query(
    db: AsyncSession,
    query: Select,
    page: int = 1,
    page_size: int = 50
) -> Tuple[List[T], int]:
    """
    Execute a paginated query and return results with total count.
    
    Args:
        db: Database session
        query: SQLAlchemy select query
        page: Page number (1-indexed)
        page_size: Number of items per page
    
    Returns:
        Tuple of (items, total_count)
    """
    # Get total count
    count_query = select(sql_func.count()).select_from(query.alias())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    # Apply pagination
    pagination = PaginationParams(page, page_size)
    paginated_query = query.offset(pagination.offset).limit(pagination.limit)
    
    # Execute query
    result = await db.execute(paginated_query)
    items = result.scalars().all()
    
    return items, total

def calculate_total_pages(total: int, page_size: int) -> int:
    """Calculate total pages from total count and page size"""
    return math.ceil(total / page_size) if total > 0 else 0

