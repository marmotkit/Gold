from extensions import db
from datetime import datetime

class Tournament(db.Model):
    __tablename__ = 'tournaments'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    participants = db.relationship('Participant', backref='tournament', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Tournament {self.name}>'

class Participant(db.Model):
    __tablename__ = 'participants'
    
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournaments.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    gender = db.Column(db.String(1))
    handicap = db.Column(db.Float)
<<<<<<< HEAD
    member_id = db.Column(db.String(20))
    member_number = db.Column(db.String(20))
    registration_number = db.Column(db.String(20))
    pre_group_code = db.Column(db.String(20))
    group_code = db.Column(db.String(20))
=======
    member_number = db.Column(db.String(50))
    registration_number = db.Column(db.String(50))
    pre_group_code = db.Column(db.String(50))
    group_code = db.Column(db.String(50))
>>>>>>> temp-deploy
    group_number = db.Column(db.Integer)
    notes = db.Column(db.Text)
    display_order = db.Column(db.Integer)
    checked_in = db.Column(db.Boolean, default=False)
    check_in_time = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

<<<<<<< HEAD
    def to_dict(self):
        return {
            'id': self.id,
            'tournament_id': self.tournament_id,
            'name': self.name,
            'gender': self.gender,
            'handicap': self.handicap,
            'member_id': self.member_id,
            'member_number': self.member_number,
            'registration_number': self.registration_number,
            'pre_group_code': self.pre_group_code,
            'group_code': self.group_code,
            'group_number': self.group_number,
            'notes': self.notes,
            'display_order': self.display_order,
            'checked_in': self.checked_in,
            'check_in_time': self.check_in_time.isoformat() if self.check_in_time else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

=======
>>>>>>> temp-deploy
    def __repr__(self):
        return f'<Participant {self.name}>'
