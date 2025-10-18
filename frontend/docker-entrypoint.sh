#!/bin/sh
set -e

echo "Starting Pastoral TDC Frontend..."

# Replace environment variables in nginx config template
echo "Configuring nginx with backend URL: ${BACKEND_URL:-http://localhost:8000}"
envsubst '${PORT} ${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'
