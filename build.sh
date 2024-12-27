#!/usr/bin/env bash
# Install system dependencies
apt-get update
apt-get install -y python3-dev build-essential

# Upgrade pip
pip install --upgrade pip

# 安裝前端依賴並構建
cd frontend
npm install
CI=false npm run build
cd ..

# Install Python packages
pip install -r requirements.txt
