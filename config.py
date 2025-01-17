import os
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = True
    CORS_HEADERS = ['Content-Type', 'Authorization', 'Content-Disposition']
    SQLALCHEMY_ENGINE_OPTIONS = {
        'echo': True,
        'pool_pre_ping': True
    }

    @staticmethod
    def init_app(app):
        pass

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///instance/golf.db'
    CORS_ORIGINS = ['http://localhost:3000']

class ProductionConfig(Config):
    DEBUG = False
    
    # 獲取數據庫 URL
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    if not SQLALCHEMY_DATABASE_URI:
        logger.warning("DATABASE_URL not set, using SQLite")
        SQLALCHEMY_DATABASE_URI = 'sqlite:///instance/golf.db'
    elif SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)
    
    logger.info(f"Using database URL: {SQLALCHEMY_DATABASE_URI}")
    
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'max_overflow': 20,
        'pool_timeout': 60,
        'pool_recycle': 1800,
        'pool_pre_ping': True
    }
    
    CORS_ORIGINS = [
        'https://gold-tawny.vercel.app',
        'http://localhost:3000'
    ]

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
