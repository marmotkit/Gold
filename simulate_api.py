import os
import sys
import json

# 確保可以導入專案模組
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import Tournament, Participant
from flask import jsonify

with app.app_context():
    def simulate_get_tournament_participants(tournament_id):
        try:
            # 模擬 API 的完整流程
            print(f"嘗試獲取比賽 {tournament_id} 的參賽者")
            
            # 檢查比賽是否存在
            tournament = Tournament.query.get(tournament_id)
            if not tournament:
                print(f"錯誤：找不到 ID 為 {tournament_id} 的比賽")
                return None
            
            # 查詢參賽者
            participants = Participant.query.filter_by(tournament_id=tournament_id).order_by(Participant.display_order).all()
            
            print(f"找到 {len(participants)} 位參賽者")
            
            # 轉換為字典
            result = []
            for p in participants:
                participant_dict = p.to_dict()
                result.append(participant_dict)
            
            # 模擬 JSON 序列化
            json_result = json.dumps(result, ensure_ascii=False)
            print("JSON 序列化成功")
            
            return result
        
        except Exception as e:
            print(f"發生錯誤：{str(e)}")
            import traceback
            traceback.print_exc()
            return None

    # 執行模擬
    result = simulate_get_tournament_participants(1)
    
    if result:
        print("\n前5位參賽者詳細資訊：")
        for participant in result[:5]:
            print(json.dumps(participant, ensure_ascii=False, indent=2))
