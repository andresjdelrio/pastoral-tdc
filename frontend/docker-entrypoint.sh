#!/bin/sh
set -e

echo "Starting Pastoral TDC Frontend..."

# Set default values if not provided
export PORT=${PORT:-80}
export BACKEND_URL=${BACKEND_URL:-http://localhost:8000}

# Replace environment variables in nginx config template
echo "Configuring nginx with backend URL: $BACKEND_URL on port $PORT"
envsubst '${PORT},${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Debug: show the generated config
echo "Generated nginx config:"
cat /etc/nginx/conf.d/default.conf

# Start nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'
