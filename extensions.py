from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def init_extensions(app):
    db.init_app(app)
    migrate.init_app(app, db)
    
    # 測試數據庫連接
    with app.app_context():
        try:
            db.engine.connect()
            print("數據庫連接成功")
            db.create_all()
            print("數據庫表創建成功")
        except Exception as e:
            print(f"數據庫連接或創建表時出錯: {str(e)}")
            import traceback
            print(traceback.format_exc())
