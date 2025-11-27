"""Common pagination schemas for API responses"""
from pydantic import BaseModel
from typing import List, TypeVar, Generic

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response schema"""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

