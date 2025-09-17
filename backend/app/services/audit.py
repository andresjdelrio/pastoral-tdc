import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.inspection import inspect

from app.models import AuditLog


class AuditService:
    """Service for managing audit trail logging."""

    @staticmethod
    def log_action(
        db: Session,
        user_id: Optional[str],
        action: str,
        entity: str,
        entity_id: int,
        before_data: Optional[Dict[str, Any]] = None,
        after_data: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """
        Log an action to the audit trail.

        Args:
            db: Database session
            user_id: User identifier or "system" for automated actions
            action: Action performed (create, update, delete, toggle_attendance, etc.)
            entity: Entity type (registrant, registration, activity, etc.)
            entity_id: ID of the affected entity
            before_data: Data state before the change
            after_data: Data state after the change
            request_id: Request UUID for tracing
            ip_address: Client IP address
            user_agent: Client user agent string

        Returns:
            Created AuditLog instance
        """
        audit_entry = AuditLog(
            user_id=user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            before_json=json.dumps(before_data, default=str) if before_data else None,
            after_json=json.dumps(after_data, default=str) if after_data else None,
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent
        )

        db.add(audit_entry)
        db.commit()
        return audit_entry

    @staticmethod
    def log_model_change(
        db: Session,
        user_id: Optional[str],
        action: str,
        model_instance: Any,
        before_data: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """
        Log a model change with automatic entity detection.

        Args:
            db: Database session
            user_id: User identifier
            action: Action performed
            model_instance: SQLAlchemy model instance
            before_data: Data before change (for updates)
            request_id: Request UUID
            ip_address: Client IP
            user_agent: Client user agent

        Returns:
            Created AuditLog instance
        """
        # Get entity name from model class
        entity = model_instance.__class__.__name__.lower()
        entity_id = model_instance.id

        # Convert model to dict for after_data
        after_data = AuditService._model_to_dict(model_instance)

        return AuditService.log_action(
            db=db,
            user_id=user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            before_data=before_data,
            after_data=after_data,
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent
        )

    @staticmethod
    def _model_to_dict(model_instance: Any) -> Dict[str, Any]:
        """Convert SQLAlchemy model instance to dictionary."""
        result = {}
        for column in inspect(model_instance).mapper.column_attrs:
            value = getattr(model_instance, column.key)
            if isinstance(value, datetime):
                result[column.key] = value.isoformat()
            else:
                result[column.key] = value
        return result

    @staticmethod
    def get_audit_trail(
        db: Session,
        entity: Optional[str] = None,
        entity_id: Optional[int] = None,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> list[AuditLog]:
        """
        Retrieve audit trail entries with optional filtering.

        Args:
            db: Database session
            entity: Filter by entity type
            entity_id: Filter by specific entity ID
            user_id: Filter by user ID
            action: Filter by action type
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            List of AuditLog entries
        """
        query = db.query(AuditLog)

        if entity:
            query = query.filter(AuditLog.entity == entity)
        if entity_id:
            query = query.filter(AuditLog.entity_id == entity_id)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action == action)

        return query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()


# Middleware for request ID generation and logging
class RequestContextMiddleware:
    """Middleware to add request IDs and logging context."""

    def __init__(self):
        self.request_id = None
        self.user_id = None
        self.ip_address = None
        self.user_agent = None

    def generate_request_id(self) -> str:
        """Generate a new UUID for the request."""
        self.request_id = str(uuid.uuid4())
        return self.request_id

    def set_context(self, user_id: str = None, ip_address: str = None, user_agent: str = None):
        """Set request context information."""
        self.user_id = user_id
        self.ip_address = ip_address
        self.user_agent = user_agent

    def get_context(self) -> Dict[str, Any]:
        """Get current request context."""
        return {
            'request_id': self.request_id,
            'user_id': self.user_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent
        }


# Global request context (in production, use proper context management)
request_context = RequestContextMiddleware()