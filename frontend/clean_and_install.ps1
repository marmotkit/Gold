Write-Host "開始清理..." -ForegroundColor Green

# 刪除 node_modules
if (Test-Path "node_modules") {
    Write-Host "刪除 node_modules..." -ForegroundColor Yellow
    Get-ChildItem -Path "node_modules" -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
    Remove-Item "node_modules" -Force -Recurse -ErrorAction SilentlyContinue
}

# 刪除 package-lock.json
if (Test-Path "package-lock.json") {
    Write-Host "刪除 package-lock.json..." -ForegroundColor Yellow
    Remove-Item "package-lock.json" -Force -ErrorAction SilentlyContinue
}

Write-Host "清理 npm 緩存..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "安裝依賴..." -ForegroundColor Green
npm install --legacy-peer-deps

Write-Host "啟動應用..." -ForegroundColor Green
npm start
