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
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("DATABASE_URL environment variable is not set")
        
    # 處理 Postgres URL
    if SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)
    
    logger.info(f"使用數據庫 URL: {SQLALCHEMY_DATABASE_URI}")
    
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'max_overflow': 20,
        'pool_timeout': 60,
        'pool_recycle': 1800,
        'pool_pre_ping': True,
        'echo': True,
        'connect_args': {
            'connect_timeout': 10,
            'keepalives': 1,
            'keepalives_idle': 30,
            'keepalives_interval': 10,
            'keepalives_count': 5
        }
    }
    CORS_ORIGINS = [
        'https://gold-1-ccpj.onrender.com',
        'https://gold-v00p.onrender.com'
    ]

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
