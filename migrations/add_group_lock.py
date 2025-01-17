from flask import current_app
from flask_migrate import Migrate
from extensions import db
from models import Group

def upgrade():
    # 添加 is_locked 欄位
    with current_app.app_context():
        db.session.execute('ALTER TABLE "group" ADD COLUMN is_locked BOOLEAN DEFAULT FALSE')
        db.session.commit()

def downgrade():
    # 移除 is_locked 欄位
    with current_app.app_context():
        db.session.execute('ALTER TABLE "group" DROP COLUMN is_locked')
        db.session.commit()
