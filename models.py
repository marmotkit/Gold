from datetime import datetime
from extensions import db

class Tournament(db.Model):
    __tablename__ = 'tournaments'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.Date, nullable=False)
    location = db.Column(db.String(200))
    description = db.Column(db.Text)
    group_order = db.Column(db.Text)  # 存儲分組順序，以逗號分隔
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    participants = db.relationship('Participant', backref='tournament', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'date': self.date.isoformat() if self.date else None,
            'location': self.location,
            'description': self.description,
            'group_order': self.group_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Tournament {self.name}>'

class Participant(db.Model):
    __tablename__ = 'participants'
    
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournaments.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    gender = db.Column(db.String(1))
    handicap = db.Column(db.Float)
    member_number = db.Column(db.String(50))
    registration_number = db.Column(db.String(50))
    pre_group_code = db.Column(db.String(50))  # 預分組代碼
    group_code = db.Column(db.String(50))
    group_number = db.Column(db.Integer)
    notes = db.Column(db.Text)
    display_order = db.Column(db.Integer)
    check_in_status = db.Column(db.String(20), default='not_checked_in')
    check_in_time = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'tournament_id': self.tournament_id,
            'name': self.name,
            'gender': self.gender,
            'handicap': self.handicap,
            'member_number': self.member_number,
            'registration_number': self.registration_number,
            'pre_group_code': self.pre_group_code,
            'group_code': self.group_code,
            'group_number': self.group_number,
            'notes': self.notes,
            'display_order': self.display_order,
            'check_in_status': self.check_in_status,
            'check_in_time': self.check_in_time.isoformat() if self.check_in_time else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Participant {self.name}>'
