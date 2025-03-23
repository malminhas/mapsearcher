FROM python:3.11-slim

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create logs directory and data directory
RUN mkdir -p logs data

# Create a volume mount point for the database
VOLUME /app/data

# Expose the API port
EXPOSE 8000

# Command to run the application
CMD ["python", "location_api.py"]
