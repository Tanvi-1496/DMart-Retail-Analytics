@echo off
set "PATH=C:\Users\hp\AppData\Local\Python\pythoncore-3.14-64;C:\Users\hp\AppData\Local\Python\pythoncore-3.14-64\Scripts;%PATH%"
echo Starting DMart Analytics FastAPI Backend on http://127.0.0.1:8000 ...
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
