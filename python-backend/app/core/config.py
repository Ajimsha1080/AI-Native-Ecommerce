import os
from typing import List

class Settings:
    APP_ENV: str = os.getenv("APP_ENV", "development").lower()
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://shopmate_app:shopmate_secure_app_pwd_2026@127.0.0.1:5432/aaas_enterprise")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    
    # Secrets
    SESSION_JWT_SECRET: str = os.getenv("SESSION_JWT_SECRET", "super_secure_enterprise_session_jwt_secret_32bytes_long!")
    SERVICE_JWT_SECRET: str = os.getenv("SERVICE_JWT_SECRET", "super_secure_enterprise_service_jwt_secret_32bytes_long!")
    INTERNAL_SERVICE_SECRET: str = os.getenv("INTERNAL_SERVICE_SECRET", "super_secure_enterprise_service_jwt_secret_32bytes_long!")
    AUTH_COOKIE_NAME: str = os.getenv("AUTH_COOKIE_NAME", "aaas_session_token")
    CSRF_COOKIE_NAME: str = "aaas_csrf_token"

    # Stripe & Razorpay
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    RAZORPAY_ME_URL: str = os.getenv("RAZORPAY_ME_URL", "https://razorpay.me/@ajimshamuhammad2112")

    # Sarvam AI
    SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "")

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()
    ]

settings = Settings()
