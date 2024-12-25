# 高爾夫比賽活動管理系統

這是一個用於管理高爾夫比賽活動的系統，支援網頁和 Line 群組使用。

## 主要功能

- 匯入參賽名單及自動分組
- 比賽報到管理
- 取消報到和動態重新分組
- 多賽事管理

## 安裝需求

1. Python 3.8+
2. Node.js 16+

## 安裝步驟

1. 安裝 Python 依賴：
```bash
pip install -r requirements.txt
```

2. 安裝前端依賴：
```bash
cd frontend
npm install
```

3. 設定環境變數：
創建 `.env` 檔案並設定以下變數：
```
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token
FLASK_SECRET_KEY=your_flask_secret_key
```

## 啟動應用

1. 啟動後端服務：
```bash
python app.py
```

2. 啟動前端服務：
```bash
cd frontend
npm start
```
