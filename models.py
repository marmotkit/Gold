from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Tournament(db.Model):
    __tablename__ = 'tournaments'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.Date, nullable=False)
    participants = db.relationship('Participant', backref='tournament', lazy=True, cascade="all, delete-orphan")
    checkins = db.relationship('CheckIn', backref='tournament', lazy=True, cascade="all, delete-orphan")
    groups = db.relationship('Group', backref='tournament', lazy=True, cascade="all, delete-orphan")

class Participant(db.Model):
    __tablename__ = 'participants'
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournaments.id'), nullable=False)
    registration_number = db.Column(db.String(50))
    member_number = db.Column(db.String(50))
    name = db.Column(db.String(100), nullable=False)
    handicap = db.Column(db.Float)
    pre_group_code = db.Column(db.String(50))
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'))
    group_code = db.Column(db.String(50))  # 分組代碼
    group_order = db.Column(db.Integer)  # 在分組中的順序
    notes = db.Column(db.Text)
    check_in_status = db.Column(db.String(20), default='not_checked_in')  # 'checked_in', 'cancelled', 'not_checked_in'
    check_in_time = db.Column(db.DateTime)
    checkin = db.relationship('CheckIn', backref='participant', lazy=True, uselist=False, cascade="all, delete-orphan")

class Group(db.Model):
    __tablename__ = 'groups'
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournaments.id'), nullable=False)
    group_number = db.Column(db.String(50), nullable=False)
    participants = db.relationship('Participant', backref='group', lazy=True)

class CheckIn(db.Model):
    __tablename__ = 'checkins'
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournaments.id'), nullable=False)
    participant_id = db.Column(db.Integer, db.ForeignKey('participants.id'), nullable=False)
    checkin_time = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
