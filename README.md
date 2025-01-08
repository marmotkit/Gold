# 高爾夫球賽管理系統

這是一個使用 Flask (後端) 和 React (前端) 開發的高爾夫球賽管理系統。

## 系統需求

- Python 3.8 或以上
- Node.js 14 或以上
- SQLite (預設) 或 MySQL/PostgreSQL

## 安裝步驟

### 1. 克隆專案

```bash
git clone <repository-url>
cd Gold
```

### 2. 設置後端

1. 創建並啟動虛擬環境：
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

2. 安裝依賴：
```bash
pip install -r requirements.txt
```

3. 設置環境變數：
```bash
# 複製環境變數範例檔
copy .env.example .env
# 編輯 .env 文件，設置必要的環境變數
```

4. 初始化資料庫：
```bash
flask db upgrade
```

### 3. 設置前端

1. 進入前端目錄：
```bash
cd frontend
```

2. 安裝依賴：
```bash
npm install
```

## 啟動應用

### 1. 啟動後端

在專案根目錄下：
```bash
# Windows
python app.py
# Linux/Mac
flask run
```

後端服務將在 http://localhost:8000 運行

### 2. 啟動前端

在 frontend 目錄下：
```bash
npm start
```

前端應用將在 http://localhost:3000 運行

## 使用說明

1. 打開瀏覽器訪問 http://localhost:3000
2. 系統功能包括：
   - 賽事管理
   - 參賽者管理
   - 分組管理
   - 報到管理
   - 分組表匯出

## 常見問題

1. 如果遇到資料庫連接問題：
   - 確認 .env 文件中的資料庫設置正確
   - 確認資料庫服務正在運行

2. 如果遇到 CORS 問題：
   - 確認後端和前端的地址配置正確
   - 檢查 frontend/src/config.js 中的 API URL 設置

## 注意事項

1. 在生產環境中部署時：
   - 修改 .env 中的 FLASK_ENV 為 production
   - 設置安全的 SECRET_KEY
   - 使用生產級別的資料庫（如 PostgreSQL）
   - 配置適當的安全措施（如 HTTPS）

2. 資料備份：
   - 定期備份資料庫
   - 保存重要的配置文件

## 技術支援

如有任何問題，請聯繫系統管理員或參考技術文檔。
