from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from database import get_db
from services.fee_invoice_service import FeeInvoiceService
from schemas.fee_invoice_schemas import FeeInvoiceCreate, FeeInvoiceUpdate, FeeInvoiceResponse, FeeInvoiceBulkCreate
from utils.school_utils import verify_school_active
from utils.auth_dependencies import get_current_staff
from models.staff import Staff

router = APIRouter(prefix="/fee-invoices", tags=["Fee Invoices"])

@router.get("/", response_model=List[dict])
async def get_all_invoices(
    school_id: UUID,
    fee_id: Optional[UUID] = Query(None, description="Filter by fee_id"),
    db: AsyncSession = Depends(get_db)
):
    """Get all invoice records for a specific school, optionally filtered by fee_id"""
    try:
        await verify_school_active(school_id, db)
        invoice_service = FeeInvoiceService(db)
        invoices = await invoice_service.get_all_invoices(school_id, fee_id=fee_id, as_dict=True)
        return invoices
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{invoice_id}", response_model=dict)
async def get_invoice_by_id(invoice_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Get an invoice record by ID"""
    try:
        await verify_school_active(school_id, db)
        invoice_service = FeeInvoiceService(db)
        invoice = await invoice_service.get_invoice_by_id(invoice_id, school_id)
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice record not found")
        return invoice.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/", response_model=FeeInvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(invoice_data: FeeInvoiceCreate, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Create a new invoice record"""
    try:
        await verify_school_active(invoice_data.school_id, db)
        invoice_service = FeeInvoiceService(db)
        invoice = await invoice_service.create_invoice(invoice_data)
        return invoice
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/bulk", response_model=List[FeeInvoiceResponse], status_code=status.HTTP_201_CREATED)
async def create_bulk_invoices(bulk_data: FeeInvoiceBulkCreate, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Create multiple invoice records for a fee"""
    try:
        await verify_school_active(bulk_data.school_id, db)
        invoice_service = FeeInvoiceService(db)
        
        # Prepare invoice data
        invoices_data = []
        for invoice in bulk_data.invoices:
            invoice_data = FeeInvoiceCreate(
                fee_id=bulk_data.fee_id,
                school_id=bulk_data.school_id,
                amount=invoice.amount,
                invoice_img=invoice.invoice_img
            )
            invoices_data.append(invoice_data)
        
        invoices = await invoice_service.create_bulk_invoices(invoices_data)
        return invoices
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{invoice_id}", response_model=FeeInvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    school_id: UUID,
    invoice_data: FeeInvoiceUpdate,
    current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing invoice record"""
    try:
        await verify_school_active(school_id, db)
        invoice_service = FeeInvoiceService(db)
        invoice = await invoice_service.update_invoice(invoice_id, school_id, invoice_data)
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice record not found")
        return invoice
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(invoice_id: UUID, school_id: UUID, current_staff: Staff = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db)):
    """Soft delete an invoice record"""
    try:
        await verify_school_active(school_id, db)
        invoice_service = FeeInvoiceService(db)
        deleted = await invoice_service.delete_invoice(invoice_id, school_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice record not found")
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))



