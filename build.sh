#!/bin/bash
set -e  # 遇到錯誤就停止

# 安裝 Python 依賴
pip install -r requirements.txt

# 安裝 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 構建前端
cd frontend
npm install
npm run build
cd ..

# 準備靜態文件
rm -rf static
mkdir -p static
cp -r frontend/build/* static/

# 執行數據庫遷移
flask db upgrade
