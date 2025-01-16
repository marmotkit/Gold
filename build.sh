#!/usr/bin/env bash
# exit on error
set -o errexit

# 安裝 Python 依賴
pip install -r requirements.txt

# 創建靜態文件夾
mkdir -p static

# 複製前端構建文件到靜態文件夾
cp -r frontend/build/* static/

# 執行數據庫遷移
python -m flask db upgrade
