from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy(engine_options={
    'pool_pre_ping': True,
    'pool_recycle': 300,
})

def init_extensions(app):
    db.init_app(app)
