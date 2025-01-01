import os

class Config:
    # 通用配置
    SECRET_KEY = 'your-secret-key-keep-it-secret'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class DevelopmentConfig(Config):
    # 本地開發環境
    DEBUG = True
    DB_PATH = os.path.join(Config.BASE_DIR, 'instance', 'golf.db')
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DB_PATH}'
    FRONTEND_URL = 'http://localhost:3000'

class ProductionConfig(Config):
    # 雲端生產環境
    DEBUG = False
    # 這裡的資料庫 URI 會在部署時設置
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///instance/golf.db')
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://your-production-frontend-url')

# 環境配置映射
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
