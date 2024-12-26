from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from datetime import datetime
import os
import pandas as pd
import re
import io
from flask import send_file

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# 配置資料庫
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "instance", "tournament.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = True

db = SQLAlchemy(app)
migrate = Migrate(app, db)

class Tournament(db.Model):
    """賽事模型"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.String(50), nullable=False)
    participants = db.relationship('Participant', backref='tournament', lazy=True, cascade='all, delete-orphan')

class Participant(db.Model):
    """參賽者模型"""
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournament.id'), nullable=False)
    registration_number = db.Column(db.String(50), nullable=False)
    original_number = db.Column(db.String(50))
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
    gender = db.Column(db.String(10))

@app.route('/api/v1/tournaments', methods=['GET'])
def get_tournaments():
    """獲取所有賽事"""
    try:
        tournaments = Tournament.query.all()
        return jsonify([{
            'id': t.id,
            'name': t.name,
            'date': t.date
        } for t in tournaments])
    except Exception as e:
        app.logger.error(f"Error getting tournaments: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/tournaments', methods=['POST'])
def create_tournament():
    """創建新賽事"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '無效的請求數據'}), 400
            
        name = data.get('name')
        date = data.get('date')
        
        if not name or not date:
            return jsonify({'error': '賽事名稱和日期為必填項'}), 400
            
        tournament = Tournament(
            name=name,
            date=date
        )
        db.session.add(tournament)
        db.session.commit()
        
        return jsonify({
            'id': tournament.id,
            'name': tournament.name,
            'date': tournament.date
        }), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating tournament: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/tournaments/<int:id>', methods=['PUT'])
def update_tournament(id):
    """更新賽事"""
    try:
        tournament = Tournament.query.get_or_404(id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '無效的請求數據'}), 400
            
        name = data.get('name')
        date = data.get('date')
        
        if not name or not date:
            return jsonify({'error': '賽事名稱和日期為必填項'}), 400
            
        tournament.name = name
        tournament.date = date
        db.session.commit()
        
        return jsonify({
            'id': tournament.id,
            'name': tournament.name,
            'date': tournament.date
        })
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating tournament: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/tournaments/<int:id>', methods=['DELETE'])
def delete_tournament(id):
    """刪除賽事"""
    try:
        tournament = Tournament.query.get_or_404(id)
        db.session.delete(tournament)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting tournament: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/tournaments/<int:tournament_id>/participants', methods=['GET'])
def get_tournament_participants(tournament_id):
    """獲取賽事的所有參賽者"""
    try:
        participants = Participant.query.filter_by(tournament_id=tournament_id).all()
        return jsonify([{
            'id': p.id,
            'registration_number': p.registration_number,
            'member_number': p.member_number,
            'name': p.name,
            'handicap': p.handicap,
            'pre_group_code': p.pre_group_code,
            'notes': p.notes,
            'check_in_status': p.check_in_status,
            'check_in_time': p.check_in_time.isoformat() if p.check_in_time else None,
            'group_code': p.group_code,
            'group_number': p.group_number,
            'group_order': p.group_order,
            'gender': p.gender
        } for p in participants])
    except Exception as e:
        app.logger.error(f"Error getting participants: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/tournaments/<int:tournament_id>/participants', methods=['POST'])
def add_tournament_participant(tournament_id):
    """添加參賽者到賽事"""
    try:
        data = request.get_json()
        
        if not data or not data.get('registration_number') or not data.get('name'):
            return jsonify({'error': '缺少必要資料'}), 400
            
        participant = Participant(
            tournament_id=tournament_id,
            registration_number=data['registration_number'],
            member_number=data.get('member_number', ''),
            name=data['name'],
            handicap=data.get('handicap'),
            pre_group_code=data.get('pre_group_code', ''),
            notes=data.get('notes', ''),
            check_in_status='not_checked_in'
        )
        
        db.session.add(participant)
        db.session.commit()
        
        return jsonify({
            'id': participant.id,
            'registration_number': participant.registration_number,
            'member_number': participant.member_number,
            'name': participant.name,
            'handicap': participant.handicap,
            'pre_group_code': participant.pre_group_code,
            'notes': participant.notes,
            'check_in_status': participant.check_in_status
        }), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error adding participant: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path and os.path.exists(os.path.join('frontend', 'build', path)):
        return send_from_directory('frontend/build', path)
    return send_from_directory('frontend/build', 'index.html')

if __name__ == '__main__':
    # 確保 instance 目錄存在
    os.makedirs(os.path.join(basedir, 'instance'), exist_ok=True)
    app.run(debug=True)