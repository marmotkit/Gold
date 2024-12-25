from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage
import pandas as pd
import os
import logging
from dotenv import load_dotenv
from datetime import datetime

# 設置日誌
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
# 配置 CORS，允許前端訪問
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type"]
    }
})

# 資料庫設定
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///golf.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Line Bot 設定
line_bot_api = LineBotApi(os.getenv('LINE_CHANNEL_ACCESS_TOKEN'))
handler = WebhookHandler(os.getenv('LINE_CHANNEL_SECRET'))

# 資料模型
class Tournament(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'date': self.date.strftime('%Y-%m-%d')
        }

class Participant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournament.id'), nullable=False)
    registration_number = db.Column(db.String(20))
    member_number = db.Column(db.String(20))
    name = db.Column(db.String(100))
    handicap = db.Column(db.Float)
    group_number = db.Column(db.Integer)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'))
    check_in_status = db.Column(db.String(20))  # 'checked_in' or 'cancelled' or None

    def to_dict(self):
        return {
            'id': self.id,
            'tournament_id': self.tournament_id,
            'registration_number': self.registration_number,
            'member_number': self.member_number,
            'name': self.name,
            'handicap': self.handicap,
            'group_number': self.group_number,
            'group_id': self.group_id,
            'check_in_status': self.check_in_status
        }

class PreGroup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournament.id'), nullable=False)
    pre_group_code = db.Column(db.String(50))  # 預編組代號
    member1 = db.Column(db.String(100))  # 名單1
    member2 = db.Column(db.String(100))  # 名單2
    member3 = db.Column(db.String(100))  # 名單3
    member4 = db.Column(db.String(100))  # 名單4

    def to_dict(self):
        return {
            'id': self.id,
            'tournament_id': self.tournament_id,
            'pre_group_code': self.pre_group_code,
            'member1': self.member1,
            'member2': self.member2,
            'member3': self.member3,
            'member4': self.member4
        }

class Group(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournament.id'), nullable=False)
    group_name = db.Column(db.String(10))
    participants = db.relationship('Participant', backref='group', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'tournament_id': self.tournament_id,
            'group_name': self.group_name,
            'participants': [{
                'id': p.id,
                'registration_number': p.registration_number,
                'member_number': p.member_number,
                'name': p.name,
                'handicap': p.handicap,
                'group_number': p.group_number,
                'check_in_status': p.check_in_status
            } for p in sorted(self.participants, key=lambda x: x.handicap if x.handicap is not None else float('inf'))]
        }

# 創建資料庫表格
with app.app_context():
    # 刪除所有現有表格
    db.drop_all()
    # 創建新表格
    db.create_all()

# API 路由
@app.route('/api/tournament', methods=['POST'])
def create_tournament():
    try:
        data = request.json
        logger.info(f"Received tournament data: {data}")
        
        if not data or 'name' not in data or 'date' not in data:
            logger.error("Missing required fields in request")
            return jsonify({'error': '缺少必要欄位'}), 400
            
        # 解析日期字符串
        try:
            date = datetime.strptime(data['date'], '%Y-%m-%d')
            logger.info(f"Parsed date: {date}")
        except ValueError as e:
            logger.error(f"Date parsing error: {str(e)}")
            return jsonify({'error': '日期格式錯誤'}), 400
        
        tournament = Tournament(
            name=data['name'],
            date=date
        )
        db.session.add(tournament)
        db.session.commit()
        logger.info(f"Tournament created successfully: {tournament.to_dict()}")
        
        return jsonify(tournament.to_dict()), 201
        
    except Exception as e:
        logger.error(f"Error creating tournament: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'創建賽事失敗: {str(e)}'}), 500

@app.route('/api/tournament', methods=['GET'])
def get_tournaments():
    try:
        tournaments = Tournament.query.all()
        return jsonify([t.to_dict() for t in tournaments])
    except Exception as e:
        logger.error(f"Error getting tournaments: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tournament/<int:tournament_id>', methods=['PUT'])
def update_tournament(tournament_id):
    try:
        logger.info(f"Updating tournament {tournament_id}")
        data = request.json
        logger.info(f"Update data: {data}")
        
        tournament = Tournament.query.get(tournament_id)
        if not tournament:
            logger.error(f"Tournament {tournament_id} not found")
            return jsonify({'error': '找不到指定的賽事'}), 404
            
        if 'name' in data:
            tournament.name = data['name']
        if 'date' in data:
            try:
                tournament.date = datetime.strptime(data['date'], '%Y-%m-%d')
            except ValueError as e:
                logger.error(f"Date parsing error: {str(e)}")
                return jsonify({'error': '日期格式錯誤'}), 400
                
        db.session.commit()
        logger.info(f"Tournament updated successfully: {tournament.to_dict()}")
        return jsonify(tournament.to_dict())
        
    except Exception as e:
        logger.error(f"Error updating tournament: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'更新賽事失敗: {str(e)}'}), 500

@app.route('/api/participants', methods=['GET'])
def get_participants():
    try:
        tournament_id = request.args.get('tournament_id')
        query = Participant.query
        if tournament_id:
            query = query.filter_by(tournament_id=tournament_id)
        participants = query.all()
        return jsonify([{
            'id': p.id,
            'tournament_id': p.tournament_id,
            'registration_number': p.registration_number,
            'member_number': p.member_number,
            'name': p.name,
            'handicap': p.handicap,
            'group_number': p.group_number,
            'group_id': p.group_id,
            'check_in_status': p.check_in_status
        } for p in participants])
    except Exception as e:
        logger.error(f"Error getting participants: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/participants/<int:participant_id>', methods=['PUT'])
def update_participant(participant_id):
    try:
        participant = Participant.query.get(participant_id)
        if not participant:
            return jsonify({'error': '找不到指定的參賽者'}), 404

        data = request.json
        if 'registration_number' in data:
            participant.registration_number = data['registration_number']
        if 'member_number' in data:
            participant.member_number = data['member_number']
        if 'name' in data:
            participant.name = data['name']
        if 'handicap' in data:
            participant.handicap = float(data['handicap'])
        if 'group_number' in data:
            participant.group_number = data['group_number']
        if 'check_in_status' in data:
            participant.check_in_status = data['check_in_status']

        db.session.commit()
        return jsonify({
            'id': participant.id,
            'tournament_id': participant.tournament_id,
            'registration_number': participant.registration_number,
            'member_number': participant.member_number,
            'name': participant.name,
            'handicap': participant.handicap,
            'group_number': participant.group_number,
            'group_id': participant.group_id,
            'check_in_status': participant.check_in_status
        })
    except Exception as e:
        logger.error(f"Error updating participant: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/participants/<int:participant_id>', methods=['DELETE'])
def delete_participant(participant_id):
    try:
        participant = Participant.query.get_or_404(participant_id)
        db.session.delete(participant)
        db.session.commit()
        return jsonify({'message': '參賽者已刪除'}), 200
    except Exception as e:
        logger.error(f"Error deleting participant: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'刪除參賽者失敗: {str(e)}'}), 500

@app.route('/api/participants/import', methods=['POST'])
def import_participants():
    try:
        if 'file' not in request.files:
            return jsonify({'error': '沒有上傳檔案'}), 400
            
        file = request.files['file']
        tournament_id = request.form.get('tournament_id')
        
        if not tournament_id:
            return jsonify({'error': '缺少賽事ID'}), 400
            
        if file.filename == '':
            return jsonify({'error': '沒有選擇檔案'}), 400
            
        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({'error': '檔案格式不正確'}), 400
            
        # 讀取 Excel 檔案
        df = pd.read_excel(file)
        
        # 檢查必要欄位
        required_columns = ['報名序號', '會員編號', '姓名', '差點']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return jsonify({'error': f'缺少必要欄位: {", ".join(missing_columns)}'}), 400
            
        # 轉換欄位名稱
        column_mapping = {
            '報名序號': 'registration_number',
            '會員編號': 'member_number',
            '姓名': 'name',
            '差點': 'handicap',
            '預分組編號': 'group_number'  # 新增預分組編號映射
        }
        
        # 重命名欄位
        df = df.rename(columns=column_mapping)
        
        # 創建參賽者列表
        participants = []
        for _, row in df.iterrows():
            participant = Participant(
                tournament_id=tournament_id,
                registration_number=str(row['registration_number']),
                member_number=str(row['member_number']),
                name=str(row['name']),
                handicap=float(row['handicap']),
                group_number=int(row['group_number']) if 'group_number' in row and pd.notna(row['group_number']) else None
            )
            participants.append(participant)
            
        # 刪除該賽事現有的參賽者
        Participant.query.filter_by(tournament_id=tournament_id).delete()
        
        # 添加新的參賽者
        for participant in participants:
            db.session.add(participant)
            
        db.session.commit()
        
        # 返回新增的參賽者列表
        return jsonify([p.to_dict() for p in participants]), 200
        
    except Exception as e:
        logger.error(f"Error importing participants: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'匯入失敗: {str(e)}'}), 500

@app.route('/api/pregroups/import', methods=['POST'])
def import_pregroups():
    try:
        if 'file' not in request.files:
            return jsonify({'error': '沒有上傳檔案'}), 400
            
        file = request.files['file']
        tournament_id = request.form.get('tournament_id')
        
        if not tournament_id:
            return jsonify({'error': '缺少賽事ID'}), 400
            
        if file.filename == '':
            return jsonify({'error': '沒有選擇檔案'}), 400
            
        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({'error': '檔案格式不正確'}), 400
            
        # 讀取 Excel 檔案
        df = pd.read_excel(file)
        
        # 檢查必要欄位
        required_columns = ['預編組代號', '名單1', '名單2', '名單3', '名單4']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return jsonify({'error': f'缺少必要欄位: {", ".join(missing_columns)}'}), 400
            
        # 刪除該賽事現有的預編組
        PreGroup.query.filter_by(tournament_id=tournament_id).delete()
        
        # 創建預編組
        pregroups = []
        for _, row in df.iterrows():
            pregroup = PreGroup(
                tournament_id=tournament_id,
                pre_group_code=str(row['預編組代號']),
                member1=str(row['名單1']),
                member2=str(row['名單2']),
                member3=str(row['名單3']),
                member4=str(row['名單4'])
            )
            db.session.add(pregroup)
            pregroups.append(pregroup)
            
        # 更新參賽者的預編組代號
        for pregroup in pregroups:
            members = [pregroup.member1, pregroup.member2, pregroup.member3, pregroup.member4]
            Participant.query.filter(
                Participant.tournament_id == tournament_id,
                Participant.name.in_(members)
            ).update({Participant.pre_group_code: pregroup.pre_group_code}, synchronize_session=False)
            
        db.session.commit()
        return jsonify([p.to_dict() for p in pregroups]), 200
        
    except Exception as e:
        logger.error(f"Error importing pregroups: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'匯入失敗: {str(e)}'}), 500

@app.route('/api/tournaments/<int:tournament_id>/auto-group', methods=['POST'])
def auto_group(tournament_id):
    try:
        # 刪除現有分組
        Group.query.filter_by(tournament_id=tournament_id).delete()
        
        # 獲取所有參賽者，按預分組編號排序
        participants = Participant.query.filter_by(tournament_id=tournament_id)\
            .order_by(Participant.group_number.nullslast(), Participant.handicap)\
            .all()
        
        print(f"找到 {len(participants)} 位參賽者")
        
        if not participants:
            return jsonify({'error': '沒有參賽者'}), 400
            
        # 按預分組編號分組
        pre_grouped = {}
        ungrouped = []
        
        for p in participants:
            print(f"處理參賽者: {p.name}, 預分組編號: {p.group_number}")
            if p.group_number:
                if p.group_number not in pre_grouped:
                    pre_grouped[p.group_number] = []
                pre_grouped[p.group_number].append(p)
            else:
                ungrouped.append(p)
        
        print(f"預分組: {len(pre_grouped)} 組, 未分組: {len(ungrouped)} 人")
        
        # 創建分組
        groups = []
        group_number = 1
        
        # 先處理預分組
        for group_num, members in pre_grouped.items():
            print(f"處理預分組 {group_num}, {len(members)} 人")
            if len(members) <= 4:  # 如果預分組人數不超過4人，直接作為一組
                group = Group(
                    tournament_id=tournament_id,
                    group_name=f'A{group_number:02d}'
                )
                db.session.add(group)
                db.session.flush()  # 取得 group.id
                groups.append(group)
                
                # 更新參賽者分組
                for p in members:
                    p.group_id = group.id
                    print(f"將 {p.name} 分配到組 {group.group_name}")
                
                group_number += 1
            else:  # 如果預分組超過4人，拆分成多個組
                for i in range(0, len(members), 4):
                    group_members = members[i:min(i+4, len(members))]
                    if len(group_members) >= 3:  # 確保每組至少3人
                        group = Group(
                            tournament_id=tournament_id,
                            group_name=f'A{group_number:02d}'
                        )
                        db.session.add(group)
                        db.session.flush()  # 取得 group.id
                        groups.append(group)
                        
                        for p in group_members:
                            p.group_id = group.id
                            print(f"將 {p.name} 分配到組 {group.group_name}")
                        
                        group_number += 1
                    else:  # 如果不足3人，加入未分組名單
                        ungrouped.extend(group_members)
        
        # 處理未分組的參賽者
        current_members = []
        
        # 按照差點排序未分組的參賽者
        ungrouped.sort(key=lambda x: x.handicap if x.handicap is not None else float('inf'))
        
        print(f"開始處理 {len(ungrouped)} 位未分組參賽者")
        
        for p in ungrouped:
            current_members.append(p)
            print(f"添加 {p.name} 到當前組，目前 {len(current_members)} 人")
            
            # 當累積4人或是最後一個人時，形成一組
            if len(current_members) == 4 or p == ungrouped[-1]:
                # 確保最後一組至少3人
                if len(current_members) >= 3 or p == ungrouped[-1]:
                    group = Group(
                        tournament_id=tournament_id,
                        group_name=f'A{group_number:02d}'
                    )
                    db.session.add(group)
                    db.session.flush()  # 取得 group.id
                    groups.append(group)
                    
                    for member in current_members:
                        member.group_id = group.id
                        print(f"將 {member.name} 分配到組 {group.group_name}")
                    
                    group_number += 1
                    current_members = []
        
        db.session.commit()
        print(f"完成分組，共 {len(groups)} 組")
        
        # 驗證分組結果
        result_groups = Group.query.filter_by(tournament_id=tournament_id).all()
        for g in result_groups:
            print(f"組別 {g.group_name} 有 {len(g.participants)} 位參賽者:")
            for p in g.participants:
                print(f"  - {p.name} (預分組編號: {p.group_number})")
        
        return jsonify([g.to_dict() for g in groups]), 200
        
    except Exception as e:
        logger.error(f"Error auto grouping: {str(e)}")
        print(f"分組錯誤: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'自動分組失敗: {str(e)}'}), 500

@app.route('/api/tournaments/<int:tournament_id>/groups', methods=['GET'])
def get_groups(tournament_id):
    try:
        groups = Group.query.filter_by(tournament_id=tournament_id)\
            .order_by(Group.group_name)\
            .all()
            
        return jsonify([{
            'id': group.id,
            'group_name': group.group_name,
            'participants': [{
                'id': p.id,
                'registration_number': p.registration_number,
                'member_number': p.member_number,
                'name': p.name,
                'handicap': p.handicap,
                'group_number': p.group_number,
                'check_in_status': p.check_in_status
            } for p in sorted(group.participants, key=lambda x: x.handicap if x.handicap is not None else float('inf'))]
        } for group in groups]), 200
        
    except Exception as e:
        logger.error(f"Error getting groups: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/checkin/<int:participant_id>', methods=['POST'])
def check_in_participant(participant_id):
    participant = Participant.query.get_or_404(participant_id)
    participant.check_in_status = 'checked_in'
    db.session.commit()
    return jsonify({'message': 'Participant checked in successfully'})

@app.route('/api/cancel-checkin/<int:participant_id>', methods=['POST'])
def cancel_check_in(participant_id):
    participant = Participant.query.get_or_404(participant_id)
    participant.check_in_status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Check-in cancelled successfully'})

@app.route('/api/regroup', methods=['POST'])
def regroup_participants():
    data = request.json
    participant_id = data['participant_id']
    new_group = data['new_group']
    
    participant = Participant.query.get_or_404(participant_id)
    participant.group_id = new_group
    db.session.commit()
    return jsonify({'message': 'Participant regrouped successfully'})

@app.route('/api/participants/batch', methods=['POST'])
def batch_save_participants():
    try:
        data = request.json
        tournament_id = data.get('tournament_id')
        participants_data = data.get('participants')
        
        if not tournament_id:
            return jsonify({'error': '缺少賽事ID'}), 400
            
        if not participants_data:
            return jsonify({'error': '缺少參賽者資料'}), 400
            
        # 記錄接收到的數據
        logger.info(f"Received tournament_id: {tournament_id}")
        logger.info(f"Received participants data: {participants_data}")
            
        # 刪除該賽事的所有現有參賽者
        Participant.query.filter_by(tournament_id=tournament_id).delete()
        
        # 添加新的參賽者
        for p_data in participants_data:
            # 確保數據格式正確
            if not all(key in p_data for key in ['registration_number', 'member_number', 'name', 'handicap']):
                return jsonify({'error': '參賽者資料格式不正確'}), 400
                
            participant = Participant(
                tournament_id=tournament_id,
                registration_number=p_data['registration_number'],
                member_number=p_data['member_number'],
                name=p_data['name'],
                handicap=float(p_data['handicap']),
                group_number=p_data.get('group_number')  # 新增預分組編號
            )
            db.session.add(participant)
            
        db.session.commit()
        return jsonify({'message': '參賽者資料已保存'}), 200
        
    except Exception as e:
        logger.error(f"Error batch saving participants: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'保存失敗: {str(e)}'}), 500

@app.route('/api/participants/<int:participant_id>/move', methods=['POST'])
def move_participant(participant_id):
    try:
        data = request.get_json()
        target_group_id = data.get('group_id')
        
        participant = Participant.query.get_or_404(participant_id)
        old_group_id = participant.group_id
        
        # 檢查目標組別是否存在且屬於同一賽事
        if target_group_id:
            target_group = Group.query.get_or_404(target_group_id)
            if target_group.tournament_id != participant.tournament_id:
                return jsonify({'error': '不能移動到不同賽事的組別'}), 400
            
            # 檢查目標組別人數是否已達上限
            if len(target_group.participants) >= 4:
                return jsonify({'error': '目標組別已達4人上限'}), 400
        
        # 更新參賽者的組別
        participant.group_id = target_group_id
        db.session.commit()
        
        # 如果原組別只剩2人或更少，返回警告
        warning = None
        if old_group_id:
            old_group = Group.query.get(old_group_id)
            if old_group and len(old_group.participants) < 3:
                warning = f'警告：組別 {old_group.group_name} 現在少於3人'
        
        # 返回更新後的組別資訊
        groups = Group.query.filter_by(tournament_id=participant.tournament_id).all()
        return jsonify({
            'groups': [g.to_dict() for g in groups],
            'warning': warning
        }), 200
        
    except Exception as e:
        logger.error(f"Error moving participant: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'移動參賽者失敗: {str(e)}'}), 500

@app.route('/api/tournaments/<int:tournament_id>/groups/save', methods=['POST'])
def save_groups(tournament_id):
    try:
        # 獲取所有分組
        groups = Group.query.filter_by(tournament_id=tournament_id).all()
        
        # 更新參賽者的 group_number 為其所在組別的名稱（不含 'A' 前綴）
        for group in groups:
            group_number = int(group.group_name[1:])  # 從 'A01' 取得 '01' 並轉為整數
            for participant in group.participants:
                participant.group_number = group_number
        
        db.session.commit()
        return jsonify({'message': '分組已保存'}), 200
        
    except Exception as e:
        logger.error(f"Error saving groups: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'保存分組失敗: {str(e)}'}), 500

@app.route('/api/tournaments/<int:tournament_id>/check-in', methods=['GET'])
def get_check_in_list(tournament_id):
    try:
        groups = Group.query.filter_by(tournament_id=tournament_id)\
            .order_by(Group.group_name)\
            .all()
            
        check_in_list = []
        for group in groups:
            group_data = {
                'id': group.id,
                'group_name': group.group_name,
                'members': []
            }
            
            # 按照差點排序組員
            sorted_participants = sorted(group.participants, key=lambda x: x.handicap if x.handicap is not None else float('inf'))
            
            # 確保每組最多4個成員
            for i in range(4):
                if i < len(sorted_participants):
                    p = sorted_participants[i]
                    group_data['members'].append({
                        'id': p.id,
                        'name': p.name,
                        'member_number': p.member_number,
                        'handicap': p.handicap,
                        'check_in_status': p.check_in_status
                    })
                else:
                    group_data['members'].append(None)
            
            check_in_list.append(group_data)
            
        return jsonify(check_in_list), 200
        
    except Exception as e:
        logger.error(f"Error getting check-in list: {str(e)}")
        return jsonify({'error': f'獲取報到名單失敗: {str(e)}'}), 500

@app.route('/api/participants/<int:participant_id>/check-in', methods=['POST'])
def update_check_in_status(participant_id):
    try:
        data = request.get_json()
        status = data.get('status')  # 'checked_in' or 'cancelled' or None
        
        participant = Participant.query.get_or_404(participant_id)
        participant.check_in_status = status
        db.session.commit()
        
        return jsonify({'message': '更新成功', 'status': status}), 200
        
    except Exception as e:
        logger.error(f"Error updating check-in status: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'更新報到狀態失敗: {str(e)}'}), 500

# Line Bot Webhook
@app.route("/callback", methods=['POST'])
def callback():
    signature = request.headers['X-Line-Signature']
    body = request.get_data(as_text=True)
    
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        return 'Invalid signature', 400
    
    return 'OK'

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    text = event.message.text
    
    # 這裡可以加入處理 Line 訊息的邏輯
    if text.startswith('查詢賽事'):
        tournaments = Tournament.query.all()
        reply_text = '目前賽事：\n' + '\n'.join([f"{t.name} ({t.date})" for t in tournaments])
    else:
        reply_text = '無法理解您的指令'
    
    line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(text=reply_text)
    )

if __name__ == '__main__':
    app.run(debug=True, port=5000)
