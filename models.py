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
    gender = db.Column(db.String(1))  # 'M' 或 'F'
    handicap = db.Column(db.Float)
    member_id = db.Column(db.String(20))  # 添加會員編號欄位
    member_number = db.Column(db.String(20))
    registration_number = db.Column(db.String(20))
    pre_group_code = db.Column(db.String(20))
    group_code = db.Column(db.String(20))
    group_number = db.Column(db.Integer)
    notes = db.Column(db.Text)
    display_order = db.Column(db.Integer)
    check_in_status = db.Column(db.Boolean, default=False)
    check_in_time = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    checked_in = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'tournament_id': self.tournament_id,
            'registration_number': self.registration_number,
            'name': self.name,
            'gender': self.gender,
            'handicap': self.handicap,
            'group_code': self.group_code,
            'display_order': self.display_order,
            'pre_group_code': self.pre_group_code,
            'notes': self.notes,
            'member_id': self.member_id,
            'checked_in': self.checked_in,
            'check_in_time': self.check_in_time.isoformat() if self.check_in_time else None
        }

    def __repr__(self):
        return f'<Participant {self.name}>'
