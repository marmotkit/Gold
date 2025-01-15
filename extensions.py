from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def init_extensions(app):
    db.init_app(app)
    migrate.init_app(app, db)
    
    # 創建所有表
    with app.app_context():
        try:
            db.create_all()
            print("數據庫表創建成功")
        except Exception as e:
            print(f"創建數據庫表時出錯: {str(e)}")
            print("嘗試執行遷移...")
            try:
                migrate.upgrade()
                print("數據庫遷移成功")
            except Exception as e:
                print(f"數據庫遷移失敗: {str(e)}")
