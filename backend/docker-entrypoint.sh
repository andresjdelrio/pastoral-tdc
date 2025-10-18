#!/bin/bash
set -e

echo "Starting Pastoral TDC Backend..."

# Try to run migrations, but don't fail if they error
echo "Attempting to run database migrations..."
if alembic upgrade head; then
    echo "Migrations completed successfully"
else
    echo "Migration failed or not needed - FastAPI will create tables automatically"
fi

# Use PORT environment variable if set, otherwise default to 8000
PORT=${PORT:-8000}

# Start the FastAPI server
echo "Starting uvicorn server on port $PORT..."
exec uvicorn main:app --host 0.0.0.0 --port $PORT
