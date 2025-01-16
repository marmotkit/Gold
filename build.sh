#!/usr/bin/env bash
# exit on error
set -o errexit

# 安裝 Python 依賴
pip install -r requirements.txt

# 安裝 Node.js 和 npm
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 安裝前端依賴並構建
cd frontend
npm install
CI=false npm run build
cd ..

# 創建靜態文件夾並複製前端構建文件
mkdir -p static
cp -r frontend/build/* static/

# 顯示靜態文件夾內容
ls -la static/

# 執行數據庫遷移
python -m flask db upgrade
