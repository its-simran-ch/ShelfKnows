FROM python:3.10-slim

WORKDIR /app

# Install minimal build tools for C-extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project code and datasets into container
COPY . .

# Hugging Face Spaces runs on port 7860
EXPOSE 7860

# Start FastAPI server
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "7860"]