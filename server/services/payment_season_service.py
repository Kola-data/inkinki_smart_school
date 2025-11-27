from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Optional
from uuid import UUID
from models.payment_season import PaymentSeason
from schemas.payment_season_schemas import PaymentSeasonCreate, PaymentSeasonUpdate
from redis_client import redis_service
from config import settings
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_database_logs, process_cache_logs

class PaymentSeasonService:
    """Service class for Payment Season CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_payment_seasons(self) -> List[PaymentSeason]:
        """Get all payment seasons that are not deleted"""
        cache_key = "payment_seasons:all"
        cached_seasons = await redis_service.get(cache_key)
        
        if cached_seasons:
            await logging_service.log_cache_operation("get", cache_key, hit=True)
            process_cache_logs.delay({
                "operation": "get",
                "key": cache_key,
                "hit": True
            })
            # Convert cached dicts back to model objects
            seasons = []
            for season_dict in cached_seasons:
                season = PaymentSeason()
                for key, value in season_dict.items():
                    if hasattr(season, key):
                        setattr(season, key, value)
                seasons.append(season)
            return seasons
        
        await logging_service.log_cache_operation("get", cache_key, hit=False)
        process_cache_logs.delay({
            "operation": "get",
            "key": cache_key,
            "hit": False
        })
        
        result = await self.db.execute(
            select(PaymentSeason).filter(
                PaymentSeason.is_deleted == False
            ).order_by(PaymentSeason.from_date.desc())
        )
        payment_seasons = result.scalars().all()
        
        await logging_service.log_database_operation("SELECT", "payment_seasons", data={"count": len(payment_seasons)})
        process_database_logs.delay({
            "operation": "SELECT",
            "table": "payment_seasons",
            "data": {"count": len(payment_seasons)}
        })
        
        seasons_data = [season.to_dict() for season in payment_seasons]
        await redis_service.set(cache_key, seasons_data, expire=settings.REDIS_CACHE_TTL)
        
        return payment_seasons
    
    async def get_payment_season_by_id(self, pay_id: UUID) -> Optional[PaymentSeason]:
        """Get a payment season by ID"""
        cache_key = f"payment_season:{pay_id}"
        cached_season = await redis_service.get(cache_key)
        
        if cached_season:
            season = PaymentSeason()
            for key, value in cached_season.items():
                if hasattr(season, key):
                    setattr(season, key, value)
            return season
        
        result = await self.db.execute(
            select(PaymentSeason).filter(
                PaymentSeason.pay_id == pay_id,
                PaymentSeason.is_deleted == False
            )
        )
        payment_season = result.scalar_one_or_none()
        
        if payment_season:
            await redis_service.set(cache_key, payment_season.to_dict(), expire=settings.REDIS_CACHE_TTL)
        
        return payment_season
    
    async def create_payment_season(self, season_data: PaymentSeasonCreate) -> PaymentSeason:
        """Create a new payment season"""
        payment_season = PaymentSeason(
            season_pay_name=season_data.season_pay_name,
            from_date=season_data.from_date,
            end_date=season_data.end_date,
            amount=season_data.amount,
            coupon_number=season_data.coupon_number,
            status=season_data.status
        )
        
        self.db.add(payment_season)
        await self.db.commit()
        await self.db.refresh(payment_season)
        
        await logging_service.log_database_operation("INSERT", "payment_seasons", data={"pay_id": str(payment_season.pay_id)})
        process_database_logs.delay({
            "operation": "INSERT",
            "table": "payment_seasons",
            "data": {"pay_id": str(payment_season.pay_id)}
        })
        
        await self._clear_payment_season_cache()
        
        return payment_season
    
    async def update_payment_season(self, pay_id: UUID, season_data: PaymentSeasonUpdate) -> Optional[PaymentSeason]:
        """Update a payment season"""
        result = await self.db.execute(
            select(PaymentSeason).filter(
                PaymentSeason.pay_id == pay_id,
                PaymentSeason.is_deleted == False
            )
        )
        payment_season = result.scalar_one_or_none()
        
        if not payment_season:
            return None
        
        update_data = season_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(payment_season, field, value)
        
        await self.db.commit()
        await self.db.refresh(payment_season)
        
        await logging_service.log_database_operation("UPDATE", "payment_seasons", data={"pay_id": str(pay_id)})
        process_database_logs.delay({
            "operation": "UPDATE",
            "table": "payment_seasons",
            "data": {"pay_id": str(pay_id)}
        })
        
        await self._clear_payment_season_cache()
        await redis_service.delete(f"payment_season:{pay_id}")
        
        return payment_season
    
    async def soft_delete_payment_season(self, pay_id: UUID) -> bool:
        """Soft delete a payment season"""
        result = await self.db.execute(
            update(PaymentSeason)
            .where(PaymentSeason.pay_id == pay_id)
            .values(is_deleted=True)
        )
        
        if result.rowcount > 0:
            await self.db.commit()
            await logging_service.log_database_operation("UPDATE", "payment_seasons", data={"pay_id": str(pay_id), "action": "soft_delete"})
            process_database_logs.delay({
                "operation": "UPDATE",
                "table": "payment_seasons",
                "data": {"pay_id": str(pay_id), "action": "soft_delete"}
            })
            await self._clear_payment_season_cache()
            await redis_service.delete(f"payment_season:{pay_id}")
            return True
        
        return False
    
    async def _clear_payment_season_cache(self):
        """Clear payment season-related cache"""
        await redis_service.delete("payment_seasons:all")

