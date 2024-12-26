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
    """參賽者模型"""
    __tablename__ = 'participants'
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournaments.id'), nullable=False)
    registration_number = db.Column(db.String(50), nullable=False)
    original_number = db.Column(db.String(20))  # 原始報名序號
    member_number = db.Column(db.String(50))
    name = db.Column(db.String(100), nullable=False)
    handicap = db.Column(db.String(50))
    pre_group_code = db.Column(db.String(50))
    notes = db.Column(db.Text)
    check_in_status = db.Column(db.String(20), default='not_checked_in')
    check_in_time = db.Column(db.DateTime)
    group_code = db.Column(db.String(50))
    group_number = db.Column(db.Integer)
    group_order = db.Column(db.Integer)
    gender = db.Column(db.String(1), default='M')  # 'M' for male, 'F' for female
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
