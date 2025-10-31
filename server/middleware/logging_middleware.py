import time
import json
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from services.logging_service import logging_service, LogLevel, ActionType
from tasks.background_tasks import process_api_logs
import asyncio

class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to automatically log all API requests and responses"""
    
    async def dispatch(self, request: Request, call_next):
        # Start timing
        start_time = time.time()
        
        # Extract request information
        method = request.method
        url = str(request.url)
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Get user ID from headers or query params (if available)
        user_id = request.headers.get("x-user-id") or request.query_params.get("user_id")
        
        # Read request body if it's JSON
        request_data = None
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if body:
                    request_data = json.loads(body.decode())
            except (json.JSONDecodeError, UnicodeDecodeError):
                request_data = {"raw_body": "non-json"}
        
        # Log API request
        await logging_service.log_api_request(
            method=method,
            endpoint=path,
            user_id=user_id,
            data={
                "url": url,
                "client_ip": client_ip,
                "user_agent": user_agent,
                "request_data": request_data
            }
        )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Extract response information
            status_code = response.status_code
            
            # Log API response
            await logging_service.log_api_response(
                method=method,
                endpoint=path,
                status_code=status_code,
                user_id=user_id,
                data={
                    "url": url,
                    "client_ip": client_ip,
                    "process_time": round(process_time, 4),
                    "response_size": response.headers.get("content-length", "unknown")
                }
            )
            
            # Add background task for detailed logging
            process_api_logs.delay({
                "method": method,
                "endpoint": path,
                "status_code": status_code,
                "user_id": user_id,
                "request_data": request_data,
                "response_data": {
                    "process_time": process_time,
                    "client_ip": client_ip
                }
            })
            
            return response
            
        except Exception as e:
            # Log error
            process_time = time.time() - start_time
            
            await logging_service.log_error(
                error=e,
                context=f"API Request: {method} {path}",
                user_id=user_id,
                endpoint=path,
                data={
                    "url": url,
                    "client_ip": client_ip,
                    "process_time": round(process_time, 4),
                    "user_agent": user_agent
                }
            )
            
            raise
