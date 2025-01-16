# coding: utf-8
import multiprocessing
import os

# 設置工作進程數
workers = multiprocessing.cpu_count() * 2 + 1

# 設置工作模式
worker_class = 'sync'

# 設置編碼
wsgi_env = {
    'LANG': 'zh_TW.UTF-8',
    'LC_ALL': 'zh_TW.UTF-8'
}

# 設置超時時間
timeout = 120

# 設置日誌級別
loglevel = 'info'

# 設置訪問日誌格式
accesslog = '-'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# 設置錯誤日誌
errorlog = '-'

# 設置編碼
forwarded_allow_ips = '*'

# 設置請求頭大小
limit_request_line = 0
limit_request_fields = 32768
limit_request_field_size = 0 