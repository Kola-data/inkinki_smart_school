from sqlalchemy import Column, String, DateTime, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class Log(Base):
    __tablename__ = "logs"
    
    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True))  # Can be staff, teacher, or student
    user_type = Column(String(50))  # staff, teacher, student, admin
    action = Column(String(100), nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, etc.
    table_name = Column(String(100))  # Which table was affected
    record_id = Column(UUID(as_uuid=True))  # ID of the affected record
    old_values = Column(Text)  # JSON string of old values
    new_values = Column(Text)  # JSON string of new values
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(Text)
    status = Column(String(20), default="SUCCESS")  # SUCCESS, FAILED, ERROR
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def to_dict(self):
        return {
            "log_id": str(self.log_id),
            "user_id": str(self.user_id) if self.user_id else None,
            "user_type": self.user_type,
            "action": self.action,
            "table_name": self.table_name,
            "record_id": str(self.record_id) if self.record_id else None,
            "old_values": self.old_values,
            "new_values": self.new_values,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "status": self.status,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
