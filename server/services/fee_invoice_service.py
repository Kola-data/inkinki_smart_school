from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from typing import List, Optional, Union, Dict, Any
from uuid import UUID
from models.fee_invoice import FeeInvoice
from models.fee_management import FeeManagement
from schemas.fee_invoice_schemas import FeeInvoiceCreate, FeeInvoiceUpdate
from redis_client import redis_service
from config import settings
import base64
import os
from datetime import datetime

class FeeInvoiceService:
    """Service class for FeeInvoice CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _clear_invoice_cache(self, school_id: UUID):
        """Clear cache for invoice operations"""
        await redis_service.delete(f"invoices:school:{school_id}")
    
    async def _save_invoice_image(self, invoice_img: Optional[str], invoice_id: UUID) -> Optional[str]:
        """Save invoice image to disk and return the path"""
        if not invoice_img:
            return None
        
        try:
            # Check if it's a base64 string
            if invoice_img.startswith('data:image'):
                # Extract base64 data
                header, data = invoice_img.split(',', 1)
                # Get file extension from header
                ext = header.split('/')[1].split(';')[0]
                image_data = base64.b64decode(data)
            else:
                # Assume it's already base64 without header
                image_data = base64.b64decode(invoice_img)
                ext = 'png'  # default extension
        except Exception as e:
            print(f"Error decoding base64 image: {e}")
            return None
        
        # Create uploads directory if it doesn't exist
        upload_dir = "uploads/invoices"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate filename
        filename = f"{invoice_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
        filepath = os.path.join(upload_dir, filename)
        
        try:
            with open(filepath, 'wb') as f:
                f.write(image_data)
            return f"uploads/invoices/{filename}"
        except Exception as e:
            print(f"Error saving invoice image: {e}")
            return None
    
    async def get_all_invoices(self, school_id: UUID, fee_id: Optional[UUID] = None, as_dict: bool = False) -> Union[List[FeeInvoice], List[Dict[str, Any]]]:
        """Get all invoice records for a specific school"""
        query = select(FeeInvoice).filter(
            FeeInvoice.school_id == school_id,
            FeeInvoice.is_deleted == False
        )
        
        if fee_id:
            query = query.filter(FeeInvoice.fee_id == fee_id)
        
        query = query.options(
            selectinload(FeeInvoice.fee_management)
        )
        
        result = await self.db.execute(query)
        invoices = result.scalars().all()
        
        if as_dict:
            invoice_list = []
            for invoice in invoices:
                invoice_dict = {
                    "invoice_id": str(invoice.invoice_id),
                    "fee_id": str(invoice.fee_id),
                    "school_id": str(invoice.school_id),
                    "amount": float(invoice.amount) if invoice.amount is not None else 0.0,
                    "invoice_img": invoice.invoice_img,
                    "is_deleted": invoice.is_deleted,
                    "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
                    "updated_at": invoice.updated_at.isoformat() if invoice.updated_at else None,
                }
                invoice_list.append(invoice_dict)
            return invoice_list
        
        return invoices
    
    async def get_invoice_by_id(self, invoice_id: UUID, school_id: UUID) -> Optional[FeeInvoice]:
        """Get a specific invoice by ID"""
        result = await self.db.execute(
            select(FeeInvoice).filter(
                FeeInvoice.invoice_id == invoice_id,
                FeeInvoice.school_id == school_id,
                FeeInvoice.is_deleted == False
            ).options(
                selectinload(FeeInvoice.fee_management)
            )
        )
        return result.scalar_one_or_none()
    
    async def create_invoice(self, invoice_data: FeeInvoiceCreate) -> FeeInvoice:
        """Create a new invoice record"""
        # Create invoice instance
        invoice = FeeInvoice(
            fee_id=invoice_data.fee_id,
            school_id=invoice_data.school_id,
            amount=invoice_data.amount,
            invoice_img=None  # Will be set after saving image
        )
        
        # Save invoice first to get invoice_id
        self.db.add(invoice)
        await self.db.flush()  # Flush to get the invoice_id
        
        # Save invoice image if provided
        if invoice_data.invoice_img:
            image_path = await self._save_invoice_image(invoice_data.invoice_img, invoice.invoice_id)
            if image_path:
                invoice.invoice_img = image_path
        
        await self.db.commit()
        await self.db.refresh(invoice)
        
        # Clear cache
        await self._clear_invoice_cache(invoice_data.school_id)
        
        return invoice
    
    async def create_bulk_invoices(self, invoices: List[FeeInvoiceCreate]) -> List[FeeInvoice]:
        """Create multiple invoice records"""
        created_invoices = []
        
        for invoice_data in invoices:
            # Create invoice instance
            invoice = FeeInvoice(
                fee_id=invoice_data.fee_id,
                school_id=invoice_data.school_id,
                amount=invoice_data.amount,
                invoice_img=None  # Will be set after saving image
            )
            
            self.db.add(invoice)
            await self.db.flush()  # Flush to get the invoice_id
            
            # Save invoice image if provided
            if invoice_data.invoice_img:
                image_path = await self._save_invoice_image(invoice_data.invoice_img, invoice.invoice_id)
                if image_path:
                    invoice.invoice_img = image_path
            
            created_invoices.append(invoice)
        
        await self.db.commit()
        
        # Refresh all invoices
        for invoice in created_invoices:
            await self.db.refresh(invoice)
        
        # Clear cache for all affected schools
        school_ids = set(inv.school_id for inv in invoices)
        for school_id in school_ids:
            await self._clear_invoice_cache(school_id)
        
        return created_invoices
    
    async def update_invoice(self, invoice_id: UUID, school_id: UUID, invoice_data: FeeInvoiceUpdate) -> Optional[FeeInvoice]:
        """Update an existing invoice record"""
        invoice = await self.get_invoice_by_id(invoice_id, school_id)
        if not invoice:
            return None
        
        # Validate school_id matches
        if invoice.school_id != school_id:
            raise ValueError(f"Invoice record does not belong to school {school_id}")
        
        # Update fields
        if invoice_data.amount is not None:
            invoice.amount = invoice_data.amount
        
        # Handle invoice image update
        if invoice_data.invoice_img is not None:
            if invoice_data.invoice_img:
                # Save new image
                image_path = await self._save_invoice_image(invoice_data.invoice_img, invoice.invoice_id)
                if image_path:
                    # Delete old image if exists
                    if invoice.invoice_img and os.path.exists(invoice.invoice_img):
                        try:
                            os.remove(invoice.invoice_img)
                        except Exception as e:
                            print(f"Error deleting old invoice image: {e}")
                    invoice.invoice_img = image_path
            else:
                # Remove image
                if invoice.invoice_img and os.path.exists(invoice.invoice_img):
                    try:
                        os.remove(invoice.invoice_img)
                    except Exception as e:
                        print(f"Error deleting invoice image: {e}")
                invoice.invoice_img = None
        
        await self.db.commit()
        await self.db.refresh(invoice)
        
        # Clear cache
        await self._clear_invoice_cache(school_id)
        
        return invoice
    
    async def delete_invoice(self, invoice_id: UUID, school_id: UUID) -> bool:
        """Soft delete an invoice record"""
        invoice = await self.get_invoice_by_id(invoice_id, school_id)
        if not invoice:
            return False
        
        # Validate school_id matches
        if invoice.school_id != school_id:
            raise ValueError(f"Invoice record does not belong to school {school_id}")
        
        invoice.is_deleted = True
        await self.db.commit()
        
        # Clear cache
        await self._clear_invoice_cache(school_id)
        
        return True



