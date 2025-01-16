# -*- coding: utf-8 -*-
import multiprocessing

bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 2

# 設置編碼
env = {
    "PYTHONIOENCODING": "utf-8",
    "LANG": "zh_TW.UTF-8",
    "LC_ALL": "zh_TW.UTF-8"
}

# 設置日誌
accesslog = "-"
errorlog = "-"
loglevel = "info"

# 設置請求頭大小
limit_request_line = 0
limit_request_fields = 32768
limit_request_field_size = 0

# 設置 WSGI 應用程序
wsgi_app = "app:app"

# 設置工作進程的啟動前鉤子
def on_starting(server):
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 設置工作進程的初始化鉤子
def worker_init(worker):
    import locale
    locale.setlocale(locale.LC_ALL, 'zh_TW.UTF-8') 