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

# 確保資料庫目錄存在
os.makedirs(os.path.join(basedir, 'instance'), exist_ok=True)

# 初始化資料庫
with app.app_context():
    db.create_all()

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

@app.route('/api/v1/tournaments/<int:tournament_id>/participants/import', methods=['POST'])
def import_participants(tournament_id):
    """匯入參賽者名單"""
    app.logger.info(f'開始匯入參賽者名單，賽事ID: {tournament_id}')
    
    try:
        if 'file' not in request.files:
            app.logger.error('未找到上傳的檔案')
            return jsonify({'error': '未找到上傳的檔案'}), 400

        file = request.files['file']
        if not file:
            app.logger.error('未選擇檔案')
            return jsonify({'error': '未選擇檔案'}), 400

        app.logger.info(f'收到檔案: {file.filename}')

        # 確認賽事存在
        tournament = Tournament.query.get_or_404(tournament_id)
        app.logger.info(f'找到賽事: {tournament.name}')

        # 讀取 Excel 檔案
        import pandas as pd
        import io

        # 讀取檔案內容到記憶體
        file_content = file.read()
        app.logger.info(f'檔案大小: {len(file_content)} bytes')
        
        try:
            # 嘗試讀取 Excel 檔案
            df = pd.read_excel(io.BytesIO(file_content))
            app.logger.info(f'成功讀取 Excel 檔案，共 {len(df)} 行，欄位: {list(df.columns)}')
        except Exception as e:
            app.logger.error(f'讀取 Excel 檔案失敗: {str(e)}')
            return jsonify({'error': f'無法讀取 Excel 檔案，錯誤訊息: {str(e)}'}), 400

        # 檢查必要欄位
        required_columns = ['報名序號', '姓名']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            app.logger.error(f'缺少必要欄位: {missing_columns}')
            return jsonify({'error': f'缺少必要欄位：{", ".join(missing_columns)}'}), 400

        # 初始化計數器
        imported_count = 0
        updated_count = 0
        error_count = 0
        error_details = []

        # 處理每一行資料
        for index, row in df.iterrows():
            try:
                # 檢查必要欄位是否有值
                if pd.isna(row['報名序號']) or pd.isna(row['姓名']):
                    app.logger.warning(f'第 {index + 2} 行缺少必要資料，跳過')
                    error_count += 1
                    error_details.append(f'第 {index + 2} 行: 報名序號或姓名為空')
                    continue

                # 格式化報名序號（確保為字串）
                registration_number = str(int(row['報名序號']) if isinstance(row['報名序號'], (int, float)) else row['報名序號'])
                app.logger.debug(f'處理第 {index + 2} 行，報名序號: {registration_number}')

                # 嘗試查找現有參賽者
                participant = Participant.query.filter_by(
                    tournament_id=tournament_id,
                    registration_number=registration_number
                ).first()

                # 準備參賽者資料
                participant_data = {
                    'name': str(row['姓名']),
                    'member_number': str(row['會員編號']) if '會員編號' in df.columns and not pd.isna(row['會員編號']) else '',
                    'handicap': str(row['差點']) if '差點' in df.columns and not pd.isna(row['差點']) else '',
                    'pre_group_code': str(int(row['預編組'])) if '預編組' in df.columns and not pd.isna(row['預編組']) else '',
                    'gender': str(row['性別']) if '性別' in df.columns and not pd.isna(row['性別']) else 'M'
                }

                if participant:
                    # 更新現有參賽者
                    for key, value in participant_data.items():
                        setattr(participant, key, value)
                    updated_count += 1
                    app.logger.debug(f'更新參賽者: {registration_number} - {participant_data["name"]}')
                else:
                    # 創建新參賽者
                    participant = Participant(
                        tournament_id=tournament_id,
                        registration_number=registration_number,
                        **participant_data
                    )
                    db.session.add(participant)
                    imported_count += 1
                    app.logger.debug(f'新增參賽者: {registration_number} - {participant_data["name"]}')

            except Exception as e:
                app.logger.error(f'處理第 {index + 2} 行時發生錯誤: {str(e)}')
                error_count += 1
                error_details.append(f'第 {index + 2} 行: {str(e)}')
                continue

        # 提交所有更改
        try:
            db.session.commit()
            result = {
                'message': f'成功匯入 {imported_count} 筆資料，更新 {updated_count} 筆資料',
                'imported_count': imported_count,
                'updated_count': updated_count
            }
            if error_count > 0:
                result['warning'] = f'有 {error_count} 筆資料處理失敗'
                result['error_details'] = error_details
            
            app.logger.info(f'匯入完成: {result}')
            return jsonify(result)
        except Exception as e:
            db.session.rollback()
            app.logger.error(f'儲存資料時發生錯誤: {str(e)}')
            return jsonify({'error': f'儲存資料時發生錯誤: {str(e)}'}), 500

    except Exception as e:
        db.session.rollback()
        app.logger.error(f'匯入過程發生錯誤: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path and os.path.exists(os.path.join('frontend', 'build', path)):
        return send_from_directory('frontend/build', path)
    return send_from_directory('frontend/build', 'index.html')

if __name__ == '__main__':
    app.run(debug=True)