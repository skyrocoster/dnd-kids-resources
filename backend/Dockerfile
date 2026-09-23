FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/workspace
WORKDIR /workspace
COPY requirements.txt requirements.txt
COPY backend/requirements.txt backend/requirements.txt
RUN python -m pip install --no-cache-dir -r requirements.txt
COPY backend backend
CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
