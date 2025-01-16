"""
高爾夫球賽管理系統 V1.2

功能說明：
1. 賽事管理
   - 新增/編輯/刪除賽事
   - 賽事日期設定

2. 參賽者管理
   - Excel 檔案匯入參賽者資料
   - 自動產生報名序號（A01、A02...）
   - 支援會員編號、姓名、差點、性別等資料
   - 可手動修改參賽者性別

3. 分組管理
   - 手動拖曳分組
   - 自動分組功能
   - 分組儲存功能
   - 匯出分組表（Excel格式）
   - 女生資料特別標示（粉紅色底色）

4. 報到管理
   - 參賽者報到功能
   - 已報到者不可刪除

版本更新紀錄：
V1.0 - 基礎功能建立
V1.1 - 新增分組匯出功能
V1.2 - 完善分組表格式，加入性別標示
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
from datetime import datetime
from io import BytesIO
import pandas as pd
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill
from flask import Flask, request, jsonify, send_file, send_from_directory, make_response
from flask_cors import CORS
from sqlalchemy import func
from config import config
from extensions import db, init_extensions
from models import Tournament, Participant
import re
import tempfile
from flask_migrate import Migrate, upgrade
import logging
from urllib.parse import quote
import socketio
import eventlet

# 配置日誌
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app.log')
    ]
)

logger = logging.getLogger(__name__)

# 獲取環境配置
config_name = os.environ.get('FLASK_ENV', 'production')

# 初始化 Flask 應用
app = Flask(__name__, 
    static_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static'),
    static_url_path='')
app.config.from_object(config[config_name])
config[config_name].init_app(app)

# 確保實例文件夾存在
if not os.path.exists('instance'):
    os.makedirs('instance')

print(f"數據庫路徑: {app.config['SQLALCHEMY_DATABASE_URI']}")

# 初始化擴展
init_extensions(app)

# 初始化數據庫
db.init_app(app)
migrate = Migrate(app, db)

# 修改 CORS 設定
CORS(app, 
     origins=["https://gold-1-ccpj.onrender.com", "http://localhost:3000"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Content-Disposition", "Accept"],
     expose_headers=["Content-Disposition"],
     supports_credentials=True,
     max_age=600)

# 確保靜態文件夾存在
@app.before_first_request
def create_static_folder():
    static_dir = app.static_folder
    if not os.path.exists(static_dir):
        os.makedirs(static_dir)
        app.logger.info(f"創建靜態文件夾: {static_dir}")
    
    # 檢查 index.html 是否存在
    index_path = os.path.join(static_dir, 'index.html')
    if not os.path.exists(index_path):
        app.logger.warning(f"找不到 index.html: {index_path}")
        # 列出靜態文件夾內容
        app.logger.info(f"靜態文件夾內容:")
        for root, dirs, files in os.walk(static_dir):
            for file in files:
                app.logger.info(f"  - {os.path.join(root, file)}")

# 初始化 Socket.IO
sio = socketio.Server(cors_allowed_origins=["https://gold-1-ccpj.onrender.com"])
socket_app = socketio.WSGIApp(sio, app)  # 使用不同的變數名稱

@app.after_request
def after_request(response):
    try:
        origin = request.headers.get('Origin')
        if origin == "https://gold-1-ccpj.onrender.com":
            response.headers.update({
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Disposition, Accept',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Max-Age': '3600',
                'Access-Control-Expose-Headers': 'Content-Disposition'
            })
        return response
    except Exception as e:
        app.logger.error(f"處理 CORS 標頭時發生錯誤：{str(e)}")
        return response

# 添加全局錯誤處理
@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f'Server Error: {error}')
    return jsonify(error=str(error)), 500

@app.errorhandler(404)
def not_found_error(error):
    app.logger.error(f'Not Found: {error}')
    return jsonify(error='Resource not found'), 404

# 健康檢查端點
@app.route('/health', methods=['GET'])
def health_check():
    app.logger.info('收到健康檢查請求')
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    }), 200

@app.after_request
def after_request(response):
    if request.method == 'OPTIONS':
        response.status_code = 200
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = '3600'
    return response

# 處理 OPTIONS 請求
@app.route('/tournaments', methods=['OPTIONS'])
def handle_options():
    response = jsonify({'status': 'ok'})
    return response

# 前端路由處理
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    app.logger.info(f"收到前端路由請求: {path}")
    try:
        if path.startswith('api/'):
            # API 請求不應該由這個處理器處理
            return jsonify({'error': 'Not Found'}), 404
            
        # 先嘗試提供靜態文件
        static_file_path = os.path.join(app.static_folder, path)
        if path and os.path.exists(static_file_path):
            app.logger.info(f"提供靜態文件: {path}")
            return send_from_directory(app.static_folder, path)
            
        # 如果不是靜態文件，返回 index.html
        index_path = os.path.join(app.static_folder, 'index.html')
        if os.path.exists(index_path):
            app.logger.info("提供 index.html")
            return send_from_directory(app.static_folder, 'index.html')
            
        app.logger.error("找不到前端文件")
        return jsonify({'error': 'Frontend files not found'}), 404
            
    except Exception as e:
        app.logger.error(f"處理前端路由時發生錯誤: {str(e)}")
        return jsonify({'error': str(e)}), 500

# API 路由
@app.route('/api/tournaments', methods=['GET'])
def get_tournaments():
    try:
        app.logger.info("獲取所有賽事列表")
        tournaments = Tournament.query.order_by(Tournament.date.desc()).all()
        return jsonify([{
            'id': t.id,
            'name': t.name,
            'date': t.date.isoformat() if t.date else None,
            'created_at': t.created_at.isoformat() if t.created_at else None
        } for t in tournaments])
    except Exception as e:
        app.logger.error(f"獲取賽事列表時發生錯誤: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tournaments', methods=['POST'])
def create_tournament():
    try:
        app.logger.info("開始建立新賽事")
        
        # 檢查請求內容
        if not request.is_json:
            app.logger.error("請求內容不是 JSON 格式")
            return jsonify({'error': '請求必須是 JSON 格式'}), 400
            
        data = request.get_json()
        if not data or 'name' not in data:
            app.logger.error("缺少必要欄位")
            return jsonify({'error': '缺少必要欄位'}), 400
            
        tournament = Tournament(
            name=data['name'],
            date=datetime.strptime(data['date'], '%Y-%m-%d').date() if 'date' in data else None
        )
        
        db.session.add(tournament)
        db.session.commit()
        
        app.logger.info(f"成功建立賽事: {tournament.name}")
        return jsonify({
            'id': tournament.id,
            'name': tournament.name,
            'date': tournament.date.isoformat() if tournament.date else None,
            'created_at': tournament.created_at.isoformat() if tournament.created_at else None
        }), 201
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"創建賽事時發生錯誤: {str(e)}")
        return jsonify({'error': str(e)}), 500

# 獲取賽事的參賽者列表
@app.route('/api/tournaments/<int:tournament_id>/participants', methods=['GET'])
def get_tournament_participants(tournament_id):
    try:
        print('================== 請求開始 ==================')
        print(f'請求路徑: {request.path}')
        print(f'請求方法: {request.method}')
        print(f'請求來源: {request.headers.get("Origin")}')
        print(f'請求頭部:')
        for name, value in request.headers.items():
            print(f'  {name}: {value}')
        print('============================================')
        
        participants = Participant.query.filter_by(tournament_id=tournament_id).order_by(Participant.display_order).all()
        print(f"\n獲取賽事 {tournament_id} 的參賽者列表")
        print(f"總共找到 {len(participants)} 位參賽者")
        
        result = []
        for p in participants:
            participant_dict = p.to_dict()
            print(f"參賽者資料：姓名={p.name}, 預分組編號={p.pre_group_code}")
            result.append(participant_dict)
            
        return jsonify(result)
        
    except Exception as e:
        print(f"獲取參賽者列表時發生錯誤：{str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

def parse_handicap(value):
    """解析差點值"""
    if pd.isna(value):
        return None
    
    try:
        # 如果是數字，直接返回
        if isinstance(value, (int, float)):
            return float(value)
        
        # 如果是字串，清理並轉換
        if isinstance(value, str):
            # 移除所有空白字符
            value = re.sub(r'\s+', '', value)
            # 如果是空字串，返回 None
            if not value:
                return None
            # 轉換為浮點數
            return float(value)
        
        return None
    except (ValueError, TypeError):
        return None

def parse_pre_group_code(value):
    """解析預分組編號"""
    if pd.isna(value):
        return None
    
    try:
        # 如果是數字，轉換為整數
        if isinstance(value, (int, float)):
            return str(int(value))
        
        # 如果是字串，清理並轉換
        if isinstance(value, str):
            # 移除所有空白字符
            value = re.sub(r'\s+', '', value)
            # 如果是空字串，返回 None
            if not value:
                return None
            # 轉換為整數
            return str(int(float(value)))
        
        return None
    except (ValueError, TypeError):
        return None

@app.route('/api/tournaments/<int:tournament_id>/participants/import', methods=['POST'])
def import_participants(tournament_id):
    try:
        app.logger.info(f"開始匯入賽事 {tournament_id} 的參賽者")
        
        # 檢查賽事是否存在
        tournament = Tournament.query.get(tournament_id)
        if not tournament:
            app.logger.error(f"找不到賽事 ID: {tournament_id}")
            return jsonify({'error': f'找不到賽事 ID: {tournament_id}'}), 404
        
        if 'file' not in request.files:
            app.logger.error("未找到上傳的檔案")
            return jsonify({'error': '未找到上傳的檔案'}), 400
            
        file = request.files['file']
        if not file:
            app.logger.error("檔案為空")
            return jsonify({'error': '檔案為空'}), 400

        # 讀取 Excel 檔案
        try:
            df = pd.read_excel(file)
            app.logger.info(f"成功讀取 Excel 檔案，共 {len(df)} 行")
        except Exception as e:
            app.logger.error(f"讀取 Excel 檔案失敗: {str(e)}")
            return jsonify({'error': f'讀取 Excel 檔案失敗: {str(e)}'}), 400

        # 檢查必要欄位
        required_columns = ['姓名', '性別', '差點']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            app.logger.error(f"缺少必要欄位: {missing_columns}")
            return jsonify({'error': f'缺少必要欄位: {missing_columns}'}), 400

        # 清理和轉換資料
        participants_data = []
        for index, row in df.iterrows():
            try:
                name = str(row['姓名']).strip()
                gender = 'F' if str(row['性別']).strip().upper() in ['F', '女'] else 'M'
                handicap = parse_handicap(row['差點'])
                
                if not name:  # 跳過沒有姓名的行
                    continue
                    
                participant_data = {
                    'name': name,
                    'gender': gender,
                    'handicap': handicap,
                    'tournament_id': tournament_id,
                    'registration_number': f'A{index+1:02d}',
                    'display_order': index
                }
                
                # 處理預分組編號
                if '預分組編號' in df.columns:
                    pre_group = parse_pre_group_code(row['預分組編號'])
                    participant_data['pre_group_code'] = pre_group
                    app.logger.info(f"參賽者 {name} 的預分組編號: {pre_group}")

                # 處理會員編號
                if '會員編號' in df.columns:
                    member_number = str(row['會員編號']).strip() if pd.notna(row['會員編號']) else None
                    participant_data['member_number'] = member_number

                participants_data.append(participant_data)
                
            except Exception as e:
                app.logger.error(f"處理第 {index+1} 行資料時發生錯誤: {str(e)}")
                continue

        # 批次新增參賽者
        try:
            # 先刪除該賽事的所有參賽者
            Participant.query.filter_by(tournament_id=tournament_id).delete()
            
            # 新增新的參賽者
            for data in participants_data:
                participant = Participant(**data)
                db.session.add(participant)
            
            db.session.commit()
            app.logger.info(f"成功匯入 {len(participants_data)} 位參賽者")
            
            return jsonify({
                'message': f'成功匯入 {len(participants_data)} 位參賽者',
                'count': len(participants_data)
            })
            
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"儲存資料時發生錯誤: {str(e)}")
            return jsonify({'error': f'儲存資料時發生錯誤: {str(e)}'}), 500

    except Exception as e:
        app.logger.error(f"匯入參賽者時發生錯誤: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# 獲取下一個報名序號
@app.route('/tournaments/<int:tournament_id>/next-registration-number', methods=['GET'])
def get_next_registration_number(tournament_id):
    try:
        print('================== 請求開始 ==================')
        print(f'請求路徑: {request.path}')
        print(f'請求方法: {request.method}')
        print(f'請求來源: {request.headers.get("Origin")}')
        print(f'請求頭部:')
        for name, value in request.headers.items():
            print(f'  {name}: {value}')
        print('============================================')
        
        # 獲取當前賽事的所有參賽者
        participants = Participant.query.filter_by(tournament_id=tournament_id).all()
        
        # 如果沒有參賽者，從 A01 開始
        if not participants:
            return jsonify({'next_number': 'A01'})
            
        # 找出最大的報名序號
        max_number = 0
        for p in participants:
            if p.registration_number and p.registration_number.startswith('A'):
                try:
                    number = int(p.registration_number[1:])
                    max_number = max(max_number, number)
                except ValueError:
                    continue
                    
        # 返回下一個序號
        next_number = f'A{(max_number + 1):02d}'
        return jsonify({'next_number': next_number})
        
    except Exception as e:
        print(f"獲取下一個報名序號時出錯：{str(e)}")
        return jsonify({'error': str(e)}), 500

# 刪除賽事
@app.route('/tournaments/<int:tournament_id>', methods=['DELETE'])
def delete_tournament(tournament_id):
    try:
        app.logger.info(f"開始刪除賽事 {tournament_id}")
        tournament = Tournament.query.get(tournament_id)
        
        if not tournament:
            app.logger.error(f"找不到賽事 ID: {tournament_id}")
            return jsonify({'error': f'找不到賽事 ID: {tournament_id}'}), 404
            
        # 檢查是否有已報到的參賽者
        has_checked_in = db.session.query(Participant).filter(
            Participant.tournament_id == tournament_id,
            Participant.checked_in.is_(True)
        ).limit(1).first() is not None
        
        if has_checked_in:
            app.logger.warning(f"賽事 {tournament_id} 有已報到的參賽者，無法刪除")
            return jsonify({'error': '該賽事有已報到的參賽者，無法刪除'}), 400
            
        # 刪除賽事及其所有參賽者
        db.session.delete(tournament)
        db.session.commit()
        
        app.logger.info(f"賽事 {tournament_id} 刪除成功")
        return jsonify({'message': '賽事刪除成功'})
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"刪除賽事時發生錯誤: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# 刪除參賽者
@app.route('/tournaments/<int:tournament_id>/participants/<int:participant_id>', methods=['DELETE'])
def delete_participant(tournament_id, participant_id):
    try:
        participant = Participant.query.get(participant_id)
        if not participant:
            return jsonify({'error': '找不到指定的參賽者'}), 404
            
        if participant.tournament_id != tournament_id:
            return jsonify({'error': '參賽者不屬於指定的賽事'}), 400
            
        if participant.checked_in:  # 使用新的欄位
            return jsonify({'error': '已報到的參賽者不能刪除'}), 400
            
        db.session.delete(participant)
        db.session.commit()
        
        return jsonify({'message': '參賽者已成功刪除'})
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"刪除參賽者時發生錯誤: {str(e)}")
        return jsonify({'error': str(e)}), 500

# 刪除全部參賽者
@app.route('/tournaments/<int:tournament_id>/participants/delete-all', methods=['DELETE'])
def delete_all_participants(tournament_id):
    try:
        print('================== 請求開始 ==================')
        print(f'請求路徑: {request.path}')
        print(f'請求方法: {request.method}')
        print(f'請求來源: {request.headers.get("Origin")}')
        print('============================================')
        
        # 檢查賽事是否存在
        tournament = Tournament.query.get(tournament_id)
        if not tournament:
            return jsonify({'error': '找不到指定的賽事'}), 404
            
        # 刪除該賽事的所有參賽者
        Participant.query.filter_by(tournament_id=tournament_id).delete()
        db.session.commit()
        
        return jsonify({'message': '成功刪除所有參賽者'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"刪除參賽者時發生錯誤：{str(e)}")
        return jsonify({'error': str(e)}), 500

# 更新報到狀態
@app.route('/tournaments/<int:tournament_id>/participants/<int:participant_id>/check-in', methods=['PUT'])
def check_in_participant(tournament_id, participant_id):
    try:
        app.logger.info(f"處理參賽者 {participant_id} 的報到請求")
        
        # 檢查賽事是否存在
        tournament = Tournament.query.get(tournament_id)
        if not tournament:
            app.logger.error(f"找不到賽事 ID: {tournament_id}")
            return jsonify({'error': f'找不到賽事 ID: {tournament_id}'}), 404
            
        # 檢查參賽者是否存在
        participant = Participant.query.get(participant_id)
        if not participant:
            app.logger.error(f"找不到參賽者 ID: {participant_id}")
            return jsonify({'error': f'找不到參賽者 ID: {participant_id}'}), 404
            
        # 檢查參賽者是否屬於該賽事
        if participant.tournament_id != tournament_id:
            app.logger.error(f"參賽者 {participant_id} 不屬於賽事 {tournament_id}")
            return jsonify({'error': '參賽者不屬於該賽事'}), 400
            
        # 更新報到狀態
        participant.checked_in = True
        participant.check_in_time = datetime.now()
        
        try:
            db.session.commit()
            app.logger.info(f"參賽者 {participant.name} 報到成功")
            
            # 使用 sio 發送事件
            sio.emit('participant_updated', {
                'tournament_id': tournament_id,
                'participant': participant.to_dict()
            })
            
            # 返回完整的參賽者資料，包括更新後的狀態
            return jsonify({
                'success': True,
                'message': '報到成功',
                'participant': participant.to_dict()
            })
            
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"儲存報到狀態時發生錯誤: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'儲存報到狀態時發生錯誤: {str(e)}'
            }), 500
            
    except Exception as e:
        app.logger.error(f"處理報到請求時發生錯誤: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 取消報到功能路由
@app.route('/tournaments/<int:tournament_id>/participants/<int:participant_id>/check-in', methods=['DELETE'])
def cancel_check_in(tournament_id, participant_id):
    try:
        app.logger.info(f"處理參賽者 {participant_id} 的取消報到請求")
        
        # 檢查賽事是否存在
        tournament = Tournament.query.get(tournament_id)
        if not tournament:
            app.logger.error(f"找不到賽事 ID: {tournament_id}")
            return jsonify({'error': f'找不到賽事 ID: {tournament_id}'}), 404
            
        # 檢查參賽者是否存在
        participant = Participant.query.get(participant_id)
        if not participant:
            app.logger.error(f"找不到參賽者 ID: {participant_id}")
            return jsonify({'error': f'找不到參賽者 ID: {participant_id}'}), 404
            
        # 檢查參賽者是否屬於該賽事
        if participant.tournament_id != tournament_id:
            app.logger.error(f"參賽者 {participant_id} 不屬於賽事 {tournament_id}")
            return jsonify({'error': '參賽者不屬於該賽事'}), 400
            
        # 更新報到狀態
        participant.checked_in = False
        participant.check_in_time = None
        
        try:
            db.session.commit()
            app.logger.info(f"參賽者 {participant.name} 取消報到成功")
            
            # 使用 sio 發送事件
            sio.emit('participant_updated', {
                'tournament_id': tournament_id,
                'participant': participant.to_dict()
            })
            
            # 返回完整的參賽者資料，包括更新後的狀態
            return jsonify({
                'success': True,
                'message': '取消報到成功',
                'participant': participant.to_dict()
            })
            
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"儲存取消報到狀態時發生錯誤: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'儲存取消報到狀態時發生錯誤: {str(e)}'
            }), 500
            
    except Exception as e:
        app.logger.error(f"處理取消報到請求時發生錯誤: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 自動分組
@app.route('/tournaments/<int:tournament_id>/auto-group', methods=['POST'])
def auto_group(tournament_id):
    try:
        app.logger.info(f"開始自動分組 - 賽事ID: {tournament_id}")
        
        # 獲取所有參賽者
        participants = Participant.query.filter_by(tournament_id=tournament_id).all()
        if not participants:
            return jsonify({'error': '沒有參賽者可供分組'}), 400

        # 將參賽者分成兩類：有預分組和沒有預分組的
        pre_grouped = {}  # 按預分組編號分類
        ungrouped = []    # 沒有預分組的參賽者

        # 先按差點排序所有參賽者
        participants.sort(key=lambda p: float(p.handicap if p.handicap is not None else 999.0))

        # 分類參賽者
        for p in participants:
            if p.pre_group_code:
                if p.pre_group_code not in pre_grouped:
                    pre_grouped[p.pre_group_code] = []
                pre_grouped[p.pre_group_code].append(p)
            else:
                ungrouped.append(p)

        group_number = 1
        
        # 先處理預分組
        for pre_code in sorted(pre_grouped.keys()):
            group = pre_grouped[pre_code]
            
            # 如果預分組不足4人，從未分組中補充
            while len(group) < 4 and ungrouped:
                group.append(ungrouped.pop(0))
            
            # 設置組別
            for p in group:
                p.group_code = str(group_number)
                
            group_number += 1

        # 處理剩下的未分組參賽者
        while ungrouped:
            current_group = ungrouped[:4]
            ungrouped = ungrouped[4:]
            
            # 設置組別
            for p in current_group:
                p.group_code = str(group_number)
            
            if current_group:  # 只有在有參賽者時才增加組號
                group_number += 1

        # 設置顯示順序
        all_participants = Participant.query.filter_by(tournament_id=tournament_id)\
            .order_by(Participant.group_code.asc())\
            .all()
            
        for i, p in enumerate(all_participants):
            p.display_order = i + 1

        # 儲存變更
        db.session.commit()
        
        app.logger.info("自動分組完成")
        return jsonify({
            'message': '自動分組完成',
            'total_groups': group_number - 1,
            'total_participants': len(participants)
        })

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"自動分組錯誤: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({'error': '自動分組失敗：' + str(e)}), 500

# 儲存分組
@app.route('/tournaments/<int:tournament_id>/groups/save', methods=['PUT'])
def save_groups(tournament_id):
    try:
        print('================== 請求開始 ==================')
        print(f'請求路徑: {request.path}')
        print(f'請求方法: {request.method}')
        print(f'請求來源: {request.headers.get("Origin")}')
        print(f'請求頭部:')
        for name, value in request.headers.items():
            print(f'  {name}: {value}')
        print('============================================')
        
        data = request.json
        groups = data.get('groups', [])
        group_order = data.get('group_order', [])
        
        if not groups:
            return jsonify({'error': '未提供分組資料'}), 400
            
        # 獲取賽事
        tournament = Tournament.query.get(tournament_id)
        if not tournament:
            return jsonify({'error': '找不到指定的賽事'}), 404
            
        # 更新所有參賽者的顯示順序和分組
        display_order = 1
        
        # 按照 group_order 的順序處理各組
        for group_code in group_order:
            group = next((g for g in groups if g['group_code'] == group_code), None)
            if group:
                for participant_id in group['participant_ids']:
                    participant = Participant.query.get(participant_id)
                    if participant and participant.tournament_id == tournament_id:
                        participant.group_code = group_code
                        participant.display_order = display_order
                        display_order += 1
        
        # 處理未分組的參賽者
        unassigned_group = next((g for g in groups if g['group_code'] == '未分組'), None)
        if unassigned_group:
            for participant_id in unassigned_group['participant_ids']:
                participant = Participant.query.get(participant_id)
                if participant and participant.tournament_id == tournament_id:
                    participant.group_code = None
                    participant.display_order = display_order
                    display_order += 1
        
        db.session.commit()
        
        return jsonify({
            'message': '分組儲存成功',
            'total_participants': display_order - 1
        })
        
    except Exception as e:
        db.session.rollback()
        print('儲存分組錯誤:', str(e))
        return jsonify({'error': '儲存分組失敗：' + str(e)}), 500

# 更新分組順序
@app.route('/tournaments/<int:tournament_id>/groups/reorder', methods=['PUT'])
def reorder_groups(tournament_id):
    try:
        print('================== 請求開始 ==================')
        print(f'請求路徑: {request.path}')
        print(f'請求方法: {request.method}')
        print(f'請求來源: {request.headers.get("Origin")}')
        print(f'請求頭部:')
        for name, value in request.headers.items():
            print(f'  {name}: {value}')
        print('============================================')
        
        data = request.get_json()
        group1 = data.get('group1')
        group2 = data.get('group2')

        if not group1 or not group2:
            return jsonify({'error': '缺少組別資訊'}), 400

        # 獲取兩個組別的參賽者
        participants1 = Participant.query.filter_by(
            tournament_id=tournament_id,
            group_code=group1
        ).all()

        participants2 = Participant.query.filter_by(
            tournament_id=tournament_id,
            group_code=group2
        ).all()

        # 交換組別代碼
        for p in participants1:
            p.group_code = group2

        for p in participants2:
            p.group_code = group1

        db.session.commit()

        return jsonify({'message': '組別順序更新成功'})

    except Exception as e:
        db.session.rollback()
        print('更新組別順序錯誤:', str(e))
        return jsonify({'error': '更新組別順序失敗：' + str(e)}), 500

# 更新參賽者組別
@app.route('/tournaments/<int:tournament_id>/participants/<int:participant_id>', methods=['PUT'])
def update_participant_group(tournament_id, participant_id):
    try:
        print('================== 請求開始 ==================')
        print(f'請求路徑: {request.path}')
        print(f'請求方法: {request.method}')
        print(f'請求來源: {request.headers.get("Origin")}')
        print(f'請求頭部:')
        for name, value in request.headers.items():
            print(f'  {name}: {value}')
        print('============================================')
        
        data = request.json
        print(f"接收到的數據：{data}")
        
        participant = Participant.query.get(participant_id)
        if not participant:
            return jsonify({'error': '找不到指定的參賽者'}), 404
            
        if participant.tournament_id != tournament_id:
            return jsonify({'error': '參賽者不屬於指定的賽事'}), 400
            
        target_group = data.get('group_code')
        
        # 更新參賽者組別
        participant.group_code = target_group
        db.session.commit()
        
        print("更新完成")
        return jsonify({
            'message': '更新成功',
            'participant': participant.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        print('更新參賽者組別錯誤:', str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/tournaments/<int:tournament_id>/save_groups', methods=['POST', 'OPTIONS'])
def save_groups_api(tournament_id):
    # 處理 OPTIONS 請求
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response

    try:
        print('================== 請求開始 ==================')
        print(f'請求路徑: {request.path}')
        print(f'請求方法: {request.method}')
        print(f'請求來源: {request.headers.get("Origin")}')
        print(f'請求頭部:')
        for name, value in request.headers.items():
            print(f'  {name}: {value}')
        print('============================================')
        
        data = request.get_json()
        print(f"接收到的數據: {data}")
        
        if not data or 'groups' not in data:
            return jsonify({'error': '無效的請求資料'}), 400
            
        groups_data = data['groups']
        print(f"接收到的分組數據: {groups_data}")
        
        # 確保沒有活動的交易
        if db.session.is_active:
            db.session.rollback()
            
        # 更新所有參賽者的分組
        for group_info in groups_data:
            group_code = group_info['group_code']
            participant_ids = group_info['participant_ids']
            print(f"處理組別 {group_code}, 參賽者: {participant_ids}")
            
            # 更新每個參賽者的分組
            for display_order, participant_id in enumerate(participant_ids, start=1):
                participant = Participant.query.get(participant_id)
                if participant:
                    participant.group_code = group_code
                    participant.display_order = display_order
                    print(f"更新參賽者 {participant_id} 到組別 {group_code}, 順序 {display_order}")
        
        # 提交所有更改
        db.session.commit()
        response = jsonify({'message': '分組儲存成功'})
        return response
        
    except Exception as e:
        db.session.rollback()
        print(f"保存分組時發生錯誤：{str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/tournaments/<int:tournament_id>/export_groups', methods=['GET'])
def export_groups(tournament_id):
    try:
        print('================== 請求開始 ==================')
        print(f'請求路徑: {request.path}')
        print(f'請求方法: {request.method}')
        print(f'請求來源: {request.headers.get("Origin")}')
        print(f'請求頭部:')
        for name, value in request.headers.items():
            print(f'  {name}: {value}')
        print('============================================')
        
        # 獲取賽事信息
        tournament = Tournament.query.get(tournament_id)
        if not tournament:
            return jsonify({'error': '找不到賽事'}), 404

        # 獲取所有參賽者並按分組和顯示順序排序
        participants = Participant.query.filter_by(tournament_id=tournament_id).order_by(
            func.cast(Participant.group_code, db.Integer).asc(),  # 將組別轉換為數字進行排序
            Participant.display_order.asc(),
            Participant.registration_number.asc()
        ).all()

        # 創建一個新的 Excel 工作簿
        wb = openpyxl.Workbook()
        
        # 創建分組名單工作表（放在最前面）
        ws_list = wb.active
        ws_list.title = "分組名單"
        
        # 設置標題
        ws_list.append([f"{tournament.name} 分組名單"])
        ws_list.append(["姓名", "性別", "備註"])
        
        # 設置標題樣式
        title_font = Font(name='微軟正黑體', size=14, bold=True)
        header_font = Font(name='微軟正黑體', size=12, bold=True)
        ws_list['A1'].font = title_font
        ws_list.merge_cells('A1:C1')
        ws_list['A1'].alignment = Alignment(horizontal='center')
        
        for cell in ws_list[2]:
            cell.font = header_font
            
        # 按組別分類參賽者
        current_group = None
        row_idx = 3
        
        for p in participants:
            if p.group_code != current_group:
                current_group = p.group_code
                group_name = f"第 {current_group} 組" if current_group else "未分組"
                ws_list.append([group_name])
                ws_list.merge_cells(f'A{row_idx}:C{row_idx}')
                ws_list[f'A{row_idx}'].font = Font(name='微軟正黑體', size=12, bold=True)
                ws_list[f'A{row_idx}'].fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
                row_idx += 1
            
            # 添加參賽者資料
            gender = "女" if p.gender == 'F' else "男"
            ws_list.append([p.name, gender, p.notes or ''])
            
            # 如果是女生，設置粉紅色背景
            if p.gender == "F":
                for cell in ws_list[row_idx]:
                    cell.fill = PatternFill(start_color="FFB6C1", end_color="FFB6C1", fill_type="solid")
            
            row_idx += 1
        
        # 調整欄寬
        ws_list.column_dimensions['A'].width = 20
        ws_list.column_dimensions['B'].width = 10
        ws_list.column_dimensions['C'].width = 30
        
        # 創建詳細資料工作表
        ws_detail = wb.create_sheet("詳細資料")
        
        # 設置標題
        ws_detail.append([f"{tournament.name} 分組詳細資料"])
        ws_detail.append(["報名序號", "會員編號", "姓名", "差點", "預分組", "分組", "性別", "備註"])
        
        # 設置標題樣式
        ws_detail['A1'].font = title_font
        ws_detail.merge_cells('A1:H1')
        ws_detail['A1'].alignment = Alignment(horizontal='center')
        
        for cell in ws_detail[2]:
            cell.font = header_font
        
        # 添加參賽者資料
        for p in participants:
            gender = "女" if p.gender == "F" else "男"
            ws_detail.append([
                p.registration_number,
                p.member_number,
                p.name,
                p.handicap,
                p.pre_group_code or '',
                p.group_code or '',
                gender,
                p.notes or ''
            ])
            
            # 如果是女生，設置粉紅色背景
            if p.gender == "F":
                row = ws_detail[ws_detail.max_row]
                for cell in row:
                    cell.fill = PatternFill(start_color="FFB6C1", end_color="FFB6C1", fill_type="solid")
        
        # 調整欄寬
        ws_detail.column_dimensions['A'].width = 15
        ws_detail.column_dimensions['B'].width = 15
        ws_detail.column_dimensions['C'].width = 20
        ws_detail.column_dimensions['D'].width = 10
        ws_detail.column_dimensions['E'].width = 10
        ws_detail.column_dimensions['F'].width = 10
        ws_detail.column_dimensions['G'].width = 10
        ws_detail.column_dimensions['H'].width = 30
        
        # 保存到 BytesIO
        excel_file = BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)
        
        return send_file(
            excel_file,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'{tournament.name}_分組名單.xlsx'
        )
        
    except Exception as e:
        print(f"匯出分組時發生錯誤：{str(e)}")
        return jsonify({'error': str(e)}), 500

# 匯出分組圖
@app.route('/tournaments/<int:tournament_id>/export_groups_diagram_v2', methods=['GET'])
def export_groups_diagram_v2(tournament_id):
    try:
        app.logger.info(f"開始匯出賽事 {tournament_id} 的分組圖")
        
        # 檢查賽事是否存在
        tournament = Tournament.query.get(tournament_id)
        if not tournament:
            app.logger.error(f"找不到賽事 ID: {tournament_id}")
            return jsonify({'error': f'找不到賽事 ID: {tournament_id}'}), 404
            
        # 獲取參賽者
        participants = Participant.query.filter_by(tournament_id=tournament_id)\
            .order_by(
                func.cast(Participant.group_code, db.Integer).asc(),
                Participant.display_order.asc()
            ).all()
            
        app.logger.info(f"找到 {len(participants)} 位參賽者")
            
        # 檢查是否有分組資料
        if not any(p.group_code for p in participants):
            app.logger.warning("沒有找到任何分組資料")
            return jsonify({'error': '沒有分組資料可供匯出'}), 400
            
        try:
            # 生成 HTML (添加 DOCTYPE 宣告)
            html = '''<!DOCTYPE html>
            <html lang="zh-TW">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{title}</title>
                <style>
                    body {{ 
                        font-family: Arial, "Microsoft JhengHei", sans-serif; 
                        padding: 20px;
                        margin: 0;
                        line-height: 1.6;
                    }}
                    .group {{ 
                        border: 1px solid #ccc;
                        margin: 10px;
                        padding: 15px;
                        display: inline-block;
                        min-width: 200px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }}
                    .female {{ 
                        background: #ffd1dc !important;
                        border-radius: 4px;
                        padding: 4px 8px;
                    }}
                    h1 {{
                        text-align: center;
                        color: #333;
                        margin-bottom: 30px;
                    }}
                    h3 {{
                        color: #2c3e50;
                        margin: 0 0 15px 0;
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 5px;
                    }}
                    .player {{
                        margin: 8px 0;
                        padding: 6px;
                        background: #f8f9fa;
                        border-radius: 4px;
                        transition: all 0.3s ease;
                    }}
                    .player.female {{
                        border-left: 4px solid #ff69b4;
                    }}
                </style>
            </head>
            <body>
                <h1>{title}</h1>
            '''.format(title=f"{tournament.name} - 分組圖")
            
            # 整理分組資料
            groups = {}
            for p in participants:
                if p.group_code:
                    # 將 group_code 轉換為整數以便正確排序
                    group_code = int(p.group_code)
                    if group_code not in groups:
                        groups[group_code] = []
                    groups[group_code].append(p)
                    app.logger.info(f"參賽者 {p.name} 被分配到第 {group_code} 組")
            
            # 生成分組 HTML，使用排序後的組別
            for group_code in sorted(groups.keys(), key=int):  # 使用 key=int 確保正確的數字排序
                html += f'<div class="group"><h3>第 {group_code} 組</h3>'
                for p in groups[group_code]:
                    style = ' female' if p.gender == 'F' else ''
                    handicap = p.handicap if p.handicap is not None else 'N/A'
                    html += f'<div class="player{style}">{p.name} ({handicap})</div>'
                html += '</div>'
            
            html += '</body></html>'
            
            # 建立回應
            response = make_response(html.encode('utf-8'))
            filename = tournament.name.encode('utf-8').decode('utf-8')
            
            # 使用 URL 編碼處理檔案名稱
            encoded_filename = quote(f"{filename}_分組圖.html")
            
            response.headers.update({
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': f'attachment; filename="{encoded_filename}"'
            })
            
            app.logger.info("分組圖匯出成功")
            return response
            
        except Exception as e:
            app.logger.error(f"生成 HTML 時發生錯誤: {str(e)}")
            return jsonify({'error': f'生成分組圖時發生錯誤: {str(e)}'}), 500
        
    except Exception as e:
        app.logger.error(f"匯出分組圖時發生錯誤: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# 儲存動態分組
@app.route('/tournaments/<int:tournament_id>/groups', methods=['POST'])
def save_dynamic_groups(tournament_id):
    try:
        # 檢查賽事是否存在
        tournament = Tournament.query.get(tournament_id)
        if not tournament:
            return jsonify({"error": "找不到該賽事"}), 404

        data = request.get_json()
        if not data or 'groups' not in data:
            return jsonify({"error": "無效的請求資料"}), 400

        groups = data['groups']
        
        # 驗證分組資料格式
        if not isinstance(groups, list):
            return jsonify({"error": "分組資料格式錯誤"}), 400
            
        for group in groups:
            if not isinstance(group, dict) or 'id' not in group or 'participants' not in group:
                return jsonify({"error": "分組資料缺少必要欄位"}), 400
            if not isinstance(group['participants'], list):
                return jsonify({"error": "參賽者資料格式錯誤"}), 400
        
        # 確保沒有活動的交易
        if db.session.is_active:
            db.session.rollback()
            
        # 清除所有參賽者的分組
        Participant.query.filter_by(tournament_id=tournament_id).update({
            'group_code': None
        })
        
        # 更新所有參賽者的分組
        for group in groups:
            group_code = group['id']
            for participant_data in group['participants']:
                if not isinstance(participant_data, dict) or 'id' not in participant_data:
                    return jsonify({"error": "參賽者資料缺少必要欄位"}), 400
                    
                participant = Participant.query.get(participant_data['id'])
                if participant and participant.tournament_id == tournament_id:
                    participant.group_code = group_code
                else:
                    return jsonify({"error": "找不到指定的參賽者"}), 404

        # 提交所有更改
        db.session.commit()
        return jsonify({"message": "分組已成功儲存"})

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"儲存動態分組時發生錯誤: {str(e)}")
        return jsonify({"error": f"儲存分組時發生錯誤: {str(e)}"}), 500

# 更新參賽者備註
@app.route('/tournaments/<int:tournament_id>/participants/<int:participant_id>/notes', methods=['PUT'])
def update_participant_notes(tournament_id, participant_id):
    try:
        print('================== 請求開始 ==================')
        print(f'請求路徑: {request.path}')
        print(f'請求方法: {request.method}')
        print(f'請求來源: {request.headers.get("Origin")}')
        print(f'請求頭部:')
        for name, value in request.headers.items():
            print(f'  {name}: {value}')
        print('============================================')
        
        data = request.get_json()
        notes = data.get('notes', '')

        participant = Participant.query.filter_by(
            tournament_id=tournament_id,
            id=participant_id
        ).first_or_404()

        participant.notes = notes
        db.session.commit()

        return jsonify({
            'message': '備註更新成功',
            'participant': participant.to_dict()
        })

    except Exception as e:
        return jsonify({
            'message': f'備註更新失敗: {str(e)}',
            'error': True
        }), 400

@app.route('/')
def index():
    return jsonify({
        'status': 'ok',
        'message': 'Golf Tournament API is running'
    })

@app.route('/favicon.ico')
def favicon():
    return '', 204  # 返回空回應，狀態碼 204 表示 No Content

# 獲取分組資料
@app.route('/tournaments/<int:tournament_id>/groups', methods=['GET'])
def get_groups(tournament_id):
    try:
        app.logger.info(f"開始獲取賽事 {tournament_id} 的分組資料")
        
        # 檢查賽事是否存在
        tournament = Tournament.query.get(tournament_id)
        if not tournament:
            app.logger.error(f"找不到賽事 ID: {tournament_id}")
            return jsonify({"error": "找不到指定的賽事"}), 404

        # 獲取該賽事的所有參賽者
        participants = Participant.query.filter_by(tournament_id=tournament_id)\
            .order_by(
                func.cast(Participant.group_code, db.Integer).asc(),
                Participant.display_order.asc()
            ).all()
        
        app.logger.info(f"找到 {len(participants)} 名參賽者")
        
        # 按照組別分組
        groups = {}
        for participant in participants:
            try:
                if participant.group_code:
                    group_id = str(participant.group_code)
                    group_name = f"第 {participant.group_code} 組"
                    
                    if group_name not in groups:
                        groups[group_name] = {
                            "id": group_id,
                            "name": group_name,
                            "participants": []
                        }
                    
                    # 添加參賽者資料，包括差點
                    participant_data = {
                        "id": participant.id,
                        "name": participant.name,
                        "gender": participant.gender,
                        "registration_number": participant.registration_number,
                        "handicap": participant.handicap,  # 確保這裡有差點資料
                        "pre_group_code": participant.pre_group_code
                    }
                    groups[group_name]["participants"].append(participant_data)
                    
            except Exception as e:
                app.logger.error(f"處理參賽者 {participant.id} 時發生錯誤: {str(e)}")
                continue

        # 轉換為列表格式並排序
        try:
            groups_list = sorted(
                list(groups.values()), 
                key=lambda x: int(x["id"]) if x["id"].isdigit() else float('inf')
            )
            app.logger.info(f"成功創建 {len(groups_list)} 個分組")
            app.logger.debug(f"分組資料: {groups_list}")  # 添加詳細日誌
            
        except Exception as e:
            app.logger.error(f"排序分組時發生錯誤: {str(e)}")
            return jsonify({"error": f"排序分組時發生錯誤: {str(e)}"}), 500

        return jsonify(groups_list)

    except Exception as e:
        app.logger.error(f"獲取分組時發生錯誤: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# 在應用啟動時執行遷移
with app.app_context():
    try:
        # 檢查是否已經存在必要欄位
        inspector = db.inspect(db.engine)
        existing_columns = inspector.get_columns('participants')
        existing_column_names = [col['name'] for col in existing_columns]
        
        # 如果存在舊的 check_in_status 欄位，將其刪除
        if 'check_in_status' in existing_column_names:
            app.logger.info("移除舊的 check_in_status 欄位...")
            db.session.execute('ALTER TABLE participants DROP COLUMN IF EXISTS check_in_status')
            app.logger.info("舊欄位移除成功")
        
        # 檢查並添加 checked_in 欄位
        if 'checked_in' not in existing_column_names:
            app.logger.info("開始添加 checked_in 欄位...")
            db.session.execute('''
                ALTER TABLE participants 
                ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE
            ''')
            app.logger.info("checked_in 欄位添加成功")
            
        # 檢查並添加 check_in_time 欄位
        if 'check_in_time' not in existing_column_names:
            app.logger.info("開始添加 check_in_time 欄位...")
            db.session.execute('''
                ALTER TABLE participants 
                ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP
            ''')
            app.logger.info("check_in_time 欄位添加成功")
            
        # 提交更改
        db.session.commit()
        app.logger.info("數據庫更新完成")
            
    except Exception as e:
        app.logger.error(f"數據庫更新失敗: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
        db.session.rollback()

@app.route('/tournaments/<int:tournament_id>/export_groups_pdf', methods=['GET'])
def export_groups_pdf(tournament_id):
    try:
        app.logger.info(f"開始匯出賽事 {tournament_id} 的分組圖")
        
        # 檢查賽事是否存在
        tournament = Tournament.query.get(tournament_id)
        if not tournament:
            app.logger.error(f"找不到賽事 ID: {tournament_id}")
            return jsonify({'error': f'找不到賽事 ID: {tournament_id}'}), 404
            
        # 獲取參賽者
        participants = Participant.query.filter_by(tournament_id=tournament_id)\
            .order_by(
                func.cast(Participant.group_code, db.Integer).asc(),
                Participant.display_order.asc()
            ).all()
            
        app.logger.info(f"找到 {len(participants)} 位參賽者")
            
        # 檢查是否有分組資料
        if not any(p.group_code for p in participants):
            app.logger.warning("沒有找到任何分組資料")
            return jsonify({'error': '沒有分組資料可供匯出'}), 400
            
        try:
            # 生成 HTML (添加 DOCTYPE 宣告)
            html = '''<!DOCTYPE html>
            <html lang="zh-TW">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{title}</title>
                <style>
                    body {{ 
                        font-family: Arial, "Microsoft JhengHei", sans-serif; 
                        padding: 20px;
                        margin: 0;
                        line-height: 1.6;
                    }}
                    .group {{ 
                        border: 1px solid #ccc;
                        margin: 10px;
                        padding: 15px;
                        display: inline-block;
                        min-width: 200px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }}
                    .female {{ 
                        background: #ffd1dc !important;
                        border-radius: 4px;
                        padding: 4px 8px;
                    }}
                    h1 {{
                        text-align: center;
                        color: #333;
                        margin-bottom: 30px;
                    }}
                    h3 {{
                        color: #2c3e50;
                        margin: 0 0 15px 0;
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 5px;
                    }}
                    .player {{
                        margin: 8px 0;
                        padding: 6px;
                        background: #f8f9fa;
                        border-radius: 4px;
                        transition: all 0.3s ease;
                    }}
                    .player.female {{
                        border-left: 4px solid #ff69b4;
                    }}
                </style>
            </head>
            <body>
                <h1>{title}</h1>
            '''.format(title=f"{tournament.name} - 分組圖")
            
            # 整理分組資料
            groups = {}
            for p in participants:
                if p.group_code:
                    if p.group_code not in groups:
                        groups[p.group_code] = []
                    groups[p.group_code].append(p)
                    app.logger.info(f"參賽者 {p.name} 被分配到第 {p.group_code} 組")
            
            # 生成分組 HTML
            for group_code in sorted(groups.keys()):
                html += f'<div class="group"><h3>第 {group_code} 組</h3>'
                for p in groups[group_code]:
                    style = ' female' if p.gender == 'F' else ''
                    handicap = p.handicap if p.handicap is not None else 'N/A'
                    html += f'<div class="player{style}">{p.name} ({handicap})</div>'
                html += '</div>'
            
            html += '</body></html>'
            
            # 建立回應
            response = make_response(html.encode('utf-8'))
            filename = tournament.name.encode('utf-8').decode('utf-8')
            
            # 使用 URL 編碼處理檔案名稱
            encoded_filename = quote(f"{filename}_分組圖.html")
            
            response.headers.update({
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': f'attachment; filename="{encoded_filename}"'
            })
            
            app.logger.info("分組圖匯出成功")
            return response
            
        except Exception as e:
            app.logger.error(f"生成 HTML 時發生錯誤: {str(e)}")
            return jsonify({'error': f'生成分組圖時發生錯誤: {str(e)}'}), 500
        
    except Exception as e:
        app.logger.error(f"匯出分組圖時發生錯誤: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.logger.info('應用啟動中...')
    app.logger.info(f'環境: {app.config.get("ENV")}')
    app.logger.info(f'調試模式: {app.config.get("DEBUG")}')
    port = int(os.environ.get('PORT', 8000))
    eventlet.wsgi.server(eventlet.listen(('0.0.0.0', port)), socket_app)  # 使用 socket_app
