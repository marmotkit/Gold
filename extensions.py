from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy(engine_options={
    'pool_pre_ping': True,
    'pool_recycle': 300,
})

migrate = Migrate()

def init_extensions(app):
    db.init_app(app)
    migrate.init_app(app, db)
