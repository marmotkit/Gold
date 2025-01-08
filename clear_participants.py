from app import app, db, Participant

def clear_participants():
    try:
        with app.app_context():
            # 刪除所有參賽者
            Participant.query.delete()
            db.session.commit()
            print("成功刪除所有參賽者數據")
    except Exception as e:
        print(f"刪除參賽者時發生錯誤：{str(e)}")

if __name__ == '__main__':
    clear_participants()
