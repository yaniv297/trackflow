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
COPY api/ ./api/
COPY __init__.py .

# Expose port (will be overridden by Railway)
EXPOSE 8000

RUN echo "This is the BACKEND Dockerfile"

# ✅ Call main.py directly to let it parse PORT
CMD ["python", "main.py"]