# Build stage
FROM python:3.11-alpine as builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    python3-dev \
    libffi-dev \
    openssl-dev

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.11-alpine

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY location_api.py .
COPY data ./data

# Create logs directory
RUN mkdir -p logs

# Create a volume mount point for the database
VOLUME /app/data

# Expose the API port
EXPOSE 8000

# Command to run the application
CMD ["python", "location_api.py"]
