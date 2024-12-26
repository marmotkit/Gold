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
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url or f'sqlite:///{os.path.join(basedir, "instance", "tournament.db")}'
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

# API 路由
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

# 確保資料庫表格存在
def init_db():
    """初始化資料庫"""
    with app.app_context():
        # 刪除所有表格
        db.drop_all()
        # 創建所有表格
        db.create_all()

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
            'check_in_status': participant.check_in_status,
            'check_in_time': participant.check_in_time.isoformat() if participant.check_in_time else None
        }), 201
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error in add_tournament_participant: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/participants/<int:participant_id>/gender', methods=['PUT'])
def update_participant_gender(participant_id):
    """更新參賽者性別"""
    try:
        participant = Participant.query.get_or_404(participant_id)
        data = request.get_json()
        participant.gender = data.get('gender', 'M')
        db.session.commit()
        return jsonify({'message': 'Gender updated successfully', 'gender': participant.gender})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/v1/participants/<int:participant_id>', methods=['DELETE'])
def delete_participant(participant_id):
    """刪除參賽者"""
    try:
        participant = Participant.query.get(participant_id)
        if not participant:
            return jsonify({'error': '找不到參賽者'}), 404
            
        db.session.delete(participant)
        db.session.commit()
        
        return jsonify({'message': '刪除成功'}), 200
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error in delete_participant: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/tournaments/<int:tournament_id>/groups', methods=['GET'])
def get_tournament_groups(tournament_id):
    """獲取賽事的分組結果"""
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
            'group_code': p.group_code,
            'group_number': p.group_number,
            'group_order': p.group_order,
            'gender': p.gender
        } for p in participants])
    except Exception as e:
        app.logger.error(f"Error getting groups: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/tournaments/<int:tournament_id>/groups', methods=['PUT'])
def update_groups(tournament_id):
    """更新分組"""
    try:
        data = request.get_json()
        
        if not data or 'participants' not in data:
            return jsonify({'error': '無效的請求數據'}), 400
            
        # 開始資料庫事務
        with db.session.begin():
            # 批量更新參賽者分組
            for p_data in data['participants']:
                participant = Participant.query.get(p_data['id'])
                if participant and participant.tournament_id == tournament_id:
                    participant.group_code = p_data['group_code']
                    participant.group_order = p_data['group_order']
            
            # 提交更改
            db.session.commit()
            
        return jsonify({'message': '分組更新成功'}), 200
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating groups: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/tournaments/<int:tournament_id>/auto-group', methods=['POST'])
def auto_group(tournament_id):
    """自動分組"""
    try:
        # 獲取所有參賽者
        participants = Participant.query.filter_by(tournament_id=tournament_id).all()
        
        if not participants:
            return jsonify({'error': '沒有參賽者可以分組'}), 400

        # 先清除所有參賽者的分組
        for participant in participants:
            participant.group_code = None
            
        # 1. 先按預分組編號分組
        pre_groups = {}
        ungrouped = []
        for participant in participants:
            if participant.pre_group_code:
                if participant.pre_group_code not in pre_groups:
                    pre_groups[participant.pre_group_code] = []
                pre_groups[participant.pre_group_code].append(participant)
            else:
                ungrouped.append(participant)
                
        # 2. 處理未分組的參賽者
        # 將差點為0的參賽者放到最前面
        zero_handicap = [p for p in ungrouped if p.handicap == '0' or p.handicap == 0]
        other_handicap = [p for p in ungrouped if p not in zero_handicap]
        
        # 按差點排序其他參賽者（從小到大）
        sorted_participants = sorted(other_handicap, 
                                  key=lambda p: float(p.handicap if p.handicap else float('inf')))
        
        # 將差點為0的參賽者加到排序後的列表前面
        sorted_participants = zero_handicap + sorted_participants
        
        # 3. 開始分組
        current_group = 1
        
        # 先處理預分組
        for pre_group in pre_groups.values():
            # 如果預分組人數不足4人，從未分組的人中補充
            while len(pre_group) < 4 and sorted_participants:
                pre_group.append(sorted_participants.pop(0))
            
            # 設定組別
            for participant in pre_group:
                participant.group_code = str(current_group)
            current_group += 1
            
        # 處理剩下的未分組參賽者
        current_group_members = []
        for participant in sorted_participants:
            current_group_members.append(participant)
            
            # 每4人一組
            if len(current_group_members) == 4:
                for p in current_group_members:
                    p.group_code = str(current_group)
                current_group += 1
                current_group_members = []
                
        # 處理最後一組（如果有的話）
        if current_group_members:
            for p in current_group_members:
                p.group_code = str(current_group)
        
        db.session.commit()
        
        # 返回更新後的分組結果
        return get_tournament_groups(tournament_id)
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error in auto_group: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/tournaments/<int:tournament_id>/import', methods=['POST'])
def import_participants(tournament_id):
    """從 Excel 檔案匯入參賽者"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': '沒有上傳檔案'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '沒有選擇檔案'}), 400
            
        if not file.filename.endswith('.xlsx'):
            return jsonify({'error': '請上傳 Excel 檔案 (.xlsx)'}), 400

        # 讀取 Excel 檔案
        df = pd.read_excel(file)
        
        # 獲取當前最大的報名序號
        max_reg_num = 0
        participants = Participant.query.filter_by(tournament_id=tournament_id).all()
        for p in participants:
            if p.registration_number and p.registration_number.startswith('A'):
                try:
                    num = int(p.registration_number[1:])
                    max_reg_num = max(max_reg_num, num)
                except ValueError:
                    pass
        
        current_reg_num = max_reg_num
        
        imported_count = 0
        updated_count = 0
        
        for _, row in df.iterrows():
            # 使用姓名作為主鍵查找參賽者
            participant = Participant.query.filter_by(
                tournament_id=tournament_id,
                name=str(row['姓名'])
            ).first()
            
            # 處理預分組編號，確保是整數
            pre_group_code = None
            if pd.notna(row.get('預分組編號')):
                try:
                    pre_group_code = int(float(str(row['預分組編號']).strip()))
                except (ValueError, TypeError):
                    pre_group_code = None
            
            if participant:
                # 更新現有參賽者
                participant.member_number = str(row['會員編號'])
                participant.handicap = float(row['差點']) if pd.notna(row['差點']) else 0
                participant.pre_group_code = str(pre_group_code) if pre_group_code is not None else ''
                participant.notes = str(row['備註']) if pd.notna(row.get('備註')) else ''
                participant.gender = 'F' if str(row['會員編號']).startswith('F') else 'M'
                updated_count += 1
            else:
                # 為新參賽者生成報名序號 (A01, A02, ...)
                current_reg_num += 1
                registration_number = f'A{current_reg_num:02d}'
                
                # 創建新參賽者
                new_participant = Participant(
                    tournament_id=tournament_id,
                    registration_number=registration_number,
                    member_number=str(row['會員編號']),
                    name=str(row['姓名']),
                    handicap=float(row['差點']) if pd.notna(row['差點']) else 0,
                    pre_group_code=str(pre_group_code) if pre_group_code is not None else '',
                    notes=str(row['備註']) if pd.notna(row.get('備註')) else '',
                    gender='F' if str(row['會員編號']).startswith('F') else 'M'
                )
                db.session.add(new_participant)
                imported_count += 1
        
        db.session.commit()
        return jsonify({
            'message': '匯入成功',
            'imported': imported_count,
            'updated': updated_count
        })
        
    except Exception as e:
        app.logger.error(f"Error importing participants: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/tournaments/<int:tournament_id>/next-registration-number', methods=['GET'])
def get_next_registration_number(tournament_id):
    """獲取下一個可用的報名序號"""
    try:
        # 獲取當前最大的報名序號
        max_reg_num = 0
        participants = Participant.query.filter_by(tournament_id=tournament_id).all()
        for p in participants:
            if p.registration_number and p.registration_number.startswith('A'):
                try:
                    num = int(p.registration_number[1:])
                    max_reg_num = max(max_reg_num, num)
                except ValueError:
                    pass
        
        # 生成下一個報名序號
        next_reg_num = max_reg_num + 1
        next_registration_number = f'A{next_reg_num:02d}'
        
        return jsonify({
            'next_registration_number': next_registration_number
        })
        
    except Exception as e:
        app.logger.error(f"Error getting next registration number: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/tournaments/<int:tournament_id>/check-ins', methods=['GET'])
def get_tournament_check_ins(tournament_id):
    """獲取賽事的報到狀態"""
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
            'gender': p.gender
        } for p in participants])
    except Exception as e:
        app.logger.error(f"Error getting check-ins: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/participants/<int:participant_id>/check-in', methods=['POST'])
def check_in_participant(participant_id):
    """報到"""
    try:
        participant = Participant.query.get(participant_id)
        if not participant:
            return jsonify({'error': '找不到參賽者'}), 404
            
        participant.check_in_status = 'checked_in'
        participant.check_in_time = datetime.now()
        
        db.session.commit()
        
        return jsonify({
            'id': participant.id,
            'registration_number': participant.registration_number,
            'member_number': participant.member_number,
            'name': participant.name,
            'handicap': participant.handicap,
            'group_code': participant.group_code,
            'check_in_status': participant.check_in_status,
            'check_in_time': participant.check_in_time.isoformat(),
            'gender': participant.gender
        })
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error in check_in: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/participants/<int:participant_id>/cancel-check-in', methods=['POST'])
def cancel_check_in(participant_id):
    """取消報到"""
    try:
        participant = Participant.query.get(participant_id)
        if not participant:
            return jsonify({'error': '找不到參賽者'}), 404
            
        participant.check_in_status = 'not_checked_in'
        participant.check_in_time = None
        
        db.session.commit()
        
        return jsonify({
            'id': participant.id,
            'registration_number': participant.registration_number,
            'member_number': participant.member_number,
            'name': participant.name,
            'handicap': participant.handicap,
            'group_code': participant.group_code,
            'check_in_status': participant.check_in_status,
            'check_in_time': None,
            'gender': participant.gender
        })
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error in cancel_check_in: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/participants/<int:participant_id>/notes', methods=['PUT'])
def update_participant_notes(participant_id):
    """更新參賽者備註"""
    try:
        data = request.json
        participant = Participant.query.get(participant_id)
        
        if not participant:
            return jsonify({'error': '找不到參賽者'}), 404
            
        participant.notes = data.get('notes', '')
        db.session.commit()
        
        return jsonify({'message': '備註更新成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/tournaments/<int:tournament_id>/groups/export', methods=['GET'])
def export_groups(tournament_id):
    """導出分組結果為 Excel"""
    try:
        app.logger.info(f"Starting export for tournament {tournament_id}")
        
        # 獲取所有參賽者並按分組和分組內順序排序
        participants = Participant.query.filter_by(tournament_id=tournament_id).order_by(
            Participant.group_code.nulls_last(),
            Participant.group_order
        ).all()
        
        app.logger.info(f"Found {len(participants)} participants")

        # 按分組整理數據
        groups = {}
        for p in participants:
            if p.group_code:
                group_number = p.group_code.split(' ')[-1]  # 從 "第 X 組" 中提取數字
                if group_number not in groups:
                    groups[group_number] = []
                groups[group_number].append(p)

        # 創建 DataFrame 數據
        data = []
        
        # 先添加已分組的參賽者
        for group_number in sorted(groups.keys(), key=lambda x: int(x)):
            # 添加分組標題
            data.append({
                '組別': f'{group_number}',
                '人數': f'{len(groups[group_number])} 人',
                '報名序號': '',
                '會員編號': '',
                '姓名': '',
                '差點': '',
                '預分組編號': '',
                '性別': ''
            })
            
            # 添加該組的參賽者
            for p in groups[group_number]:
                data.append({
                    '組別': '',
                    '人數': '',
                    '報名序號': p.registration_number,
                    '會員編號': p.member_number,
                    '姓名': p.name,
                    '差點': f'({float(p.handicap)})' if p.handicap else '(0.0)',
                    '預分組編號': p.pre_group_code or '',
                    '性別': p.gender
                })
        
        # 添加未分組的參賽者
        ungrouped = [p for p in participants if not p.group_code]
        if ungrouped:
            data.append({
                '組別': '未分組',
                '人數': f'{len(ungrouped)} 人',
                '報名序號': '',
                '會員編號': '',
                '姓名': '',
                '差點': '',
                '預分組編號': '',
                '性別': ''
            })
            for p in ungrouped:
                data.append({
                    '組別': '',
                    '人數': '',
                    '報名序號': p.registration_number,
                    '會員編號': p.member_number,
                    '姓名': p.name,
                    '差點': f'({float(p.handicap)})' if p.handicap else '(0.0)',
                    '預分組編號': p.pre_group_code or '',
                    '性別': p.gender
                })
        
        app.logger.info("Created DataFrame")
        df = pd.DataFrame(data)
        
        # 創建一個 BytesIO 對象來保存 Excel 文件
        excel_file = io.BytesIO()
        
        # 使用 ExcelWriter 來設置格式
        with pd.ExcelWriter(excel_file, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='分組結果', index=False)
            
            # 獲取 workbook 和 worksheet 對象
            workbook = writer.book
            worksheet = writer.sheets['分組結果']
            
            # 設置列寬
            worksheet.set_column('A:A', 8)   # 組別
            worksheet.set_column('B:B', 8)   # 人數
            worksheet.set_column('C:C', 12)  # 報名序號
            worksheet.set_column('D:D', 12)  # 會員編號
            worksheet.set_column('E:E', 15)  # 姓名
            worksheet.set_column('F:F', 10)  # 差點
            worksheet.set_column('G:G', 12)  # 預分組編號
            worksheet.set_column('H:H', 6)   # 性別
            
            # 添加標題格式
            header_format = workbook.add_format({
                'bold': True,
                'text_wrap': True,
                'valign': 'vcenter',
                'align': 'center',
                'bg_color': '#D9E1F2',
                'border': 1
            })
            
            # 添加分組標題格式
            group_header_format = workbook.add_format({
                'bold': True,
                'bg_color': '#E2EFDA',
                'align': 'left',
                'border': 1
            })

            # 添加一般儲存格格式
            cell_format = workbook.add_format({
                'align': 'left',
                'valign': 'vcenter',
                'border': 1
            })
            
            # 應用標題格式
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
            
            # 應用分組標題和儲存格格式
            row_num = 1
            for index, row in df.iterrows():
                if row['組別']:  # 分組標題行
                    for col_num in range(len(df.columns)):
                        worksheet.write(row_num, col_num, row.iloc[col_num], group_header_format)
                else:  # 參賽者資料行
                    for col_num in range(len(df.columns)):
                        worksheet.write(row_num, col_num, row.iloc[col_num], cell_format)
                row_num += 1
        
        app.logger.info("Excel file created successfully")
        
        # 將文件指針移到開頭
        excel_file.seek(0)
        
        # 生成文件名（包含時間戳）
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'分組結果_{timestamp}.xlsx'
        
        return send_file(
            excel_file,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        app.logger.error(f"Error exporting groups: {str(e)}")
        return jsonify({'error': f"導出失敗: {str(e)}"}), 500

@app.route('/api/v1/participants/<int:participant_id>/handicap', methods=['PUT'])
def update_participant_handicap(participant_id):
    """更新參賽者差點"""
    try:
        data = request.get_json()
        if not data or 'handicap' not in data:
            return jsonify({'error': '缺少差點數據'}), 400

        participant = Participant.query.get_or_404(participant_id)
        participant.handicap = data['handicap']
        db.session.commit()

        return jsonify({
            'id': participant.id,
            'handicap': participant.handicap
        })
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating participant handicap: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/participants/import', methods=['POST'])
def import_participants():
    """從 Excel 檔案匯入參賽者"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        tournament_id = request.form.get('tournament_id')
        
        if not file or not tournament_id:
            return jsonify({'error': 'Missing required data'}), 400
            
        df = pd.read_excel(file)
        existing_participants = Participant.query.filter_by(tournament_id=tournament_id).all()
        max_number = 0
        
        # 找出目前最大的序號
        for p in existing_participants:
            if p.registration_number.startswith('A'):
                try:
                    number = int(p.registration_number.split('/')[0][1:])
                    max_number = max(max_number, number)
                except ValueError:
                    pass

        imported_count = 0
        updated_count = 0
        
        for _, row in df.iterrows():
            member_number = str(row.get('會員編號', ''))
            original_reg_number = str(row.get('報名序號', ''))
            
            # 根據會員編號判斷性別
            gender = 'F' if member_number.startswith('F') else 'M'
            
            # 檢查是否已存在
            existing = next((p for p in existing_participants if p.member_number == member_number), None)
            
            if existing:
                # 更新現有參賽者
                existing.name = str(row.get('姓名', ''))
                existing.handicap = str(row.get('差點', ''))
                existing.pre_group_code = str(row.get('預分組', ''))
                existing.gender = gender
                updated_count += 1
            else:
                # 為新參賽者生成報名序號
                max_number += 1
                new_reg_number = f"A{max_number:02d}/{original_reg_number.split('/')[1]}" if '/' in original_reg_number else f"A{max_number:02d}"
                
                participant = Participant(
                    tournament_id=tournament_id,
                    registration_number=new_reg_number,
                    member_number=member_number,
                    name=str(row.get('姓名', '')),
                    handicap=str(row.get('差點', '')),
                    pre_group_code=str(row.get('預分組', '')),
                    gender=gender
                )
                db.session.add(participant)
                imported_count += 1
            
        db.session.commit()
        return jsonify({
            'message': f'Successfully imported {imported_count} and updated {updated_count} participants',
            'imported_count': imported_count,
            'updated_count': updated_count
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/v1/participants/update-gender', methods=['GET', 'POST'])
def update_all_genders():
    """更新所有參賽者的性別"""
    try:
        participants = Participant.query.all()
        updated_count = 0
        
        for participant in participants:
            member_number = participant.member_number
            # 根據會員編號判斷性別
            new_gender = 'F' if member_number.startswith('F') else 'M'
            
            if participant.gender != new_gender:
                participant.gender = new_gender
                updated_count += 1
        
        db.session.commit()
        return jsonify({
            'message': f'Successfully updated {updated_count} participants',
            'updated_count': updated_count
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# 靜態文件路由必須放在最後
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """提供前端靜態文件"""
    if path != "" and os.path.exists(os.path.join('frontend/build', path)):
        return send_from_directory('frontend/build', path)
    try:
        return send_from_directory('frontend/build', 'index.html')
    except:
        return jsonify({'error': '找不到檔案'}), 404

if __name__ == '__main__':
    # 確保 instance 目錄存在
    basedir = os.path.abspath(os.path.dirname(__file__))
    os.makedirs(os.path.join(basedir, 'instance'), exist_ok=True)
    
    # 初始化資料庫
    with app.app_context():
        init_db()
    
    # 啟動服務器
    app.run(host='127.0.0.1', port=5000, debug=True)