import os
import sys
import traceback

# 確保可以導入專案模組
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import Tournament, Participant
from sqlalchemy import text

def detailed_tournament_check(tournament_id):
    with app.app_context():
        try:
            # 使用原始 SQL 查詢
            raw_query = text("""
                SELECT * FROM tournaments WHERE id = :tournament_id
            """)
            raw_tournament = db.session.execute(raw_query, {'tournament_id': tournament_id}).fetchone()
            
            if not raw_tournament:
                print(f"使用原始 SQL 未找到 ID 為 {tournament_id} 的比賽")
                return False
            
            print("\n=== 使用原始 SQL 查詢比賽詳情 ===")
            for column, value in zip(raw_tournament.keys(), raw_tournament):
                print(f"{column}: {value}")
            
            # 使用原始 SQL 查詢參賽者
            raw_participants_query = text("""
                SELECT id, name, tournament_id, pre_group_code 
                FROM participants 
                WHERE tournament_id = :tournament_id 
                LIMIT 10
            """)
            raw_participants = db.session.execute(raw_participants_query, {'tournament_id': tournament_id}).fetchall()
            
            print("\n=== 前 10 位參賽者 ===")
            for participant in raw_participants:
                print(f"ID: {participant.id}, 姓名: {participant.name}, 預分組: {participant.pre_group_code}")
            
            return True
        
        except Exception as e:
            print(f"查詢時發生錯誤: {e}")
            traceback.print_exc()
            return False

# 執行檢查
detailed_tournament_check(1)
