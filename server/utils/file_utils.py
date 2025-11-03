import os
import uuid
from pathlib import Path
from fastapi import UploadFile
from config import settings
from typing import Optional

# Ensure directories exist
UPLOADS_DIR = Path(settings.UPLOAD_DIR)
SCHOOL_LOGS_DIR = Path("school_logs")

UPLOADS_DIR.mkdir(exist_ok=True)
SCHOOL_LOGS_DIR.mkdir(exist_ok=True)

def save_upload_file(file: UploadFile, subdirectory: str = "general") -> Optional[str]:
    """
    Save an uploaded file to disk and return the relative path/URL
    
    Args:
        file: FastAPI UploadFile object
        subdirectory: Subdirectory within uploads folder (e.g., 'schools', 'staff', 'students')
    
    Returns:
        Relative file path/URL or None if save fails
    """
    try:
        # Get file extension
        file_ext = Path(file.filename).suffix if file.filename else ".bin"
        
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        
        # Create subdirectory if it doesn't exist
        target_dir = UPLOADS_DIR / subdirectory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Full path
        file_path = target_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = file.file.read()
            buffer.write(content)
        
        # Return relative path that can be used as URL
        return f"uploads/{subdirectory}/{unique_filename}"
    
    except Exception as e:
        print(f"Error saving file: {e}")
        return None

def save_base64_file(base64_data: str, filename: str, subdirectory: str = "general", file_type: str = None) -> Optional[str]:
    """
    Save a base64 encoded file to disk and return the relative path/URL
    
    Args:
        base64_data: Base64 encoded file data (can include data URL prefix)
        filename: Original filename
        subdirectory: Subdirectory within uploads folder (e.g., 'schools', 'staff')
        file_type: Type of file for nested directories (e.g., 'profiles', 'nid') - used for staff files
    
    Returns:
        Relative file path/URL or None if save fails
    """
    try:
        import base64
        
        # Remove data URL prefix if present (e.g., "data:image/png;base64,")
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]
        
        # Decode base64
        file_content = base64.b64decode(base64_data)
        
        # Get file extension from filename or default
        file_ext = Path(filename).suffix if filename else ".bin"
        
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        
        # Create subdirectory path
        if file_type:
            # For nested directories like uploads/staff/profiles or uploads/staff/nid
            target_dir = UPLOADS_DIR / subdirectory / file_type
        else:
            # For simple directories like uploads/schools
            target_dir = UPLOADS_DIR / subdirectory
        
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Full path
        file_path = target_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Return relative path that can be used as URL
        if file_type:
            return f"uploads/{subdirectory}/{file_type}/{unique_filename}"
        else:
            return f"uploads/{subdirectory}/{unique_filename}"
    
    except Exception as e:
        print(f"Error saving base64 file: {e}")
        return None

def delete_file(file_path: str) -> bool:
    """
    Delete a file from the uploads directory
    
    Args:
        file_path: Relative path to the file (e.g., "uploads/schools/abc123.jpg")
    
    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        # If file_path is a relative path, resolve it against UPLOADS_DIR
        if file_path and not Path(file_path).is_absolute():
            # If it starts with "uploads/", remove that prefix
            if file_path.startswith("uploads/"):
                relative_path = file_path[len("uploads/"):]
            else:
                relative_path = file_path
            full_path = UPLOADS_DIR / relative_path
        else:
            full_path = Path(file_path)
        
        if full_path.exists() and full_path.is_file():
            full_path.unlink()
            return True
        return False
    except Exception as e:
        print(f"Error deleting file: {e}")
        return False

def get_file_url(file_path: Optional[str]) -> Optional[str]:
    """
    Convert a file path to a full URL
    
    Args:
        file_path: Relative file path
    
    Returns:
        Full URL or None
    """
    if not file_path:
        return None
    
    # If it's already a full URL, return as is
    if file_path.startswith("http"):
        return file_path
    
    # Otherwise, construct URL
    base_url = f"http://localhost:{settings.PORT}"
    return f"{base_url}/{file_path}"

