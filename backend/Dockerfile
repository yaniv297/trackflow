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
COPY utils/ ./utils/
COPY services/ ./services/
COPY __init__.py .

# Expose port (will be overridden by Railway)
EXPOSE 8000

RUN echo "This is the BACKEND Dockerfile"

# ✅ Use gunicorn with production-optimized settings
# --preload: Load app before forking = faster worker starts + shared memory
# --timeout 120: Allow slow requests (120s)
# --graceful-timeout 30: Time for workers to finish during shutdown
CMD ["sh", "-c", "gunicorn main:app -k uvicorn.workers.UvicornWorker --workers 3 --bind 0.0.0.0:${PORT:-8000} --timeout 120 --graceful-timeout 30 --preload"]