import os
import sys

# 確保可以導入專案模組
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import Tournament, Participant

with app.app_context():
    # 檢查所有比賽
    tournaments = Tournament.query.all()
    print("=== 所有比賽 ===")
    for t in tournaments:
        print(f"比賽ID: {t.id}, 名稱: {t.name}")
    
    print("\n=== 參賽者統計 ===")
    for t in tournaments:
        participants_count = Participant.query.filter_by(tournament_id=t.id).count()
        print(f"比賽 {t.id} - {t.name}: {participants_count} 位參賽者")
    
    # 檢查最近的比賽
    latest_tournament = Tournament.query.order_by(Tournament.date.desc()).first()
    if latest_tournament:
        print(f"\n最近的比賽: {latest_tournament.name} (ID: {latest_tournament.id})")
        latest_participants = Participant.query.filter_by(tournament_id=latest_tournament.id).all()
        print("最近比賽的前5位參賽者:")
        for p in latest_participants[:5]:
            print(f"  - {p.name} (ID: {p.id}, 預分組: {p.pre_group_code})")
