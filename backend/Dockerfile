FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (excluding frontend)
COPY main.py .
COPY database.py .
COPY models.py .
COPY schemas.py .
COPY workflow_models.py .
COPY workflow_schemas.py .
COPY auth.py .
COPY api/ ./api/
COPY migrations/ ./migrations/
COPY __init__.py .

# Expose port (will be overridden by Railway)
EXPOSE 8000

RUN echo "This is the BACKEND Dockerfile"

# ✅ Use gunicorn with multiple workers for production stability
CMD ["sh", "-c", "gunicorn main:app -k uvicorn.workers.UvicornWorker --workers 3 --bind 0.0.0.0:${PORT:-8000} --timeout 60"]