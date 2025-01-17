import os
import sys

# 確保可以導入專案模組
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import Tournament, Participant
from sqlalchemy import inspect

with app.app_context():
    # 檢查數據庫連接
    inspector = inspect(db.engine)
    
    print("=== 數據庫連接診斷 ===")
    print(f"數據庫引擎: {db.engine}")
    print(f"數據庫 URL: {db.engine.url}")
    
    # 檢查表是否存在
    tables = inspector.get_table_names()
    print("\n現有表格:")
    for table in tables:
        print(f"  - {table}")
    
    # 檢查比賽和參賽者表
    try:
        tournaments_count = Tournament.query.count()
        print(f"\n比賽總數: {tournaments_count}")
        
        # 檢查第一個比賽的詳細信息
        first_tournament = Tournament.query.first()
        if first_tournament:
            print(f"\n第一個比賽詳情:")
            print(f"  ID: {first_tournament.id}")
            print(f"  名稱: {first_tournament.name}")
            
            # 嘗試查詢參賽者
            participants_count = Participant.query.filter_by(tournament_id=first_tournament.id).count()
            print(f"  參賽者數量: {participants_count}")
    except Exception as e:
        print(f"\n查詢比賽時發生錯誤: {e}")
        import traceback
        traceback.print_exc()
