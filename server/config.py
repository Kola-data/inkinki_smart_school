import os
from dotenv import load_dotenv
from typing import List

# Load environment variables from .env file
load_dotenv()

class Settings:
    """Application settings loaded from environment variables"""
    
    # Database Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://kwola:asdf0780@localhost:5440/inkingi_school"
    )
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5440"))
    DB_NAME: str = os.getenv("DB_NAME", "inkingi_school")
    DB_USER: str = os.getenv("DB_USER", "kwola")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "asdf0780")
    
    # Redis Configuration (Local Redis Server)
    REDIS_CONNECTION_URL: str = os.getenv(
        "REDIS_CONNECTION_URL",
        os.getenv("REDIS_URL", "redis://localhost:6379")  # Fallback for backward compatibility
    )
    REDIS_SERVER_HOST: str = os.getenv(
        "REDIS_SERVER_HOST",
        os.getenv("REDIS_HOST", "localhost")  # Fallback for backward compatibility
    )
    REDIS_SERVER_PORT: int = int(os.getenv(
        "REDIS_SERVER_PORT",
        os.getenv("REDIS_PORT", "6379")  # Fallback for backward compatibility
    ))
    REDIS_AUTH_PASSWORD: str = os.getenv(
        "REDIS_AUTH_PASSWORD",
        os.getenv("REDIS_PASSWORD", "")  # Fallback for backward compatibility
    )
    REDIS_DATABASE_NUMBER: int = int(os.getenv(
        "REDIS_DATABASE_NUMBER",
        os.getenv("REDIS_DB", "0")  # Fallback for backward compatibility
    ))
    
    # Legacy Redis properties for backward compatibility
    @property
    def REDIS_URL(self) -> str:
        """Legacy property - use REDIS_CONNECTION_URL instead"""
        return self.REDIS_CONNECTION_URL
    
    @property
    def REDIS_HOST(self) -> str:
        """Legacy property - use REDIS_SERVER_HOST instead"""
        return self.REDIS_SERVER_HOST
    
    @property
    def REDIS_PORT(self) -> int:
        """Legacy property - use REDIS_SERVER_PORT instead"""
        return self.REDIS_SERVER_PORT
    
    @property
    def REDIS_PASSWORD(self) -> str:
        """Legacy property - use REDIS_AUTH_PASSWORD instead"""
        return self.REDIS_AUTH_PASSWORD
    
    @property
    def REDIS_DB(self) -> int:
        """Legacy property - use REDIS_DATABASE_NUMBER instead"""
        return self.REDIS_DATABASE_NUMBER
    
    # Application Configuration
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
    API_V1_STR: str = os.getenv("API_V1_STR", "/api/v1")
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    RELOAD: bool = os.getenv("RELOAD", "True").lower() == "true"
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:3000,http://localhost:5173,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:5173"
    ).split(",")
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")
    LOG_FORMAT: str = os.getenv(
        "LOG_FORMAT", 
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Cache Configuration
    CACHE_EXPIRATION_SECONDS: int = int(os.getenv("CACHE_EXPIRATION_SECONDS", os.getenv("CACHE_TTL", "3600")))
    REDIS_CACHE_EXPIRATION_SECONDS: int = int(os.getenv(
        "REDIS_CACHE_EXPIRATION_SECONDS",
        os.getenv("REDIS_CACHE_TTL", "3600")  # Fallback for backward compatibility
    ))
    
    # Legacy cache properties for backward compatibility
    @property
    def CACHE_TTL(self) -> int:
        """Legacy property - use CACHE_EXPIRATION_SECONDS instead"""
        return self.CACHE_EXPIRATION_SECONDS
    
    @property
    def REDIS_CACHE_TTL(self) -> int:
        """Legacy property - use REDIS_CACHE_EXPIRATION_SECONDS instead"""
        return self.REDIS_CACHE_EXPIRATION_SECONDS
    
    # Security Configuration
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "your-jwt-secret-key-change-this-in-production"))
    
    # Email Configuration (SMTP)
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "True").lower() == "true"
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_USER: str = os.getenv("SMTP_USER", "dreamwave610@gmail.com")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "dreamwave610@gmail.com")
    EMAILS_FROM_NAME: str = os.getenv("EMAILS_FROM_NAME", "Inkingi Smart School")
    
    # File Upload Configuration
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    
    # Project Information
    PROJECT_NAME: str = "Inkingi Smart School API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "FastAPI application with PostgreSQL and Redis integration"

# Create global settings instance
settings = Settings()

def get_settings() -> Settings:
    """Get application settings"""
    return settings
