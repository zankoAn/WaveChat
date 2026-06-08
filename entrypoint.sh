#!/bin/sh

set -e

echo "Applying database migrations..."
python manage.py migrate

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting server..."

if [ "$RELOAD" = "true" ]; then
    echo "Watcher mode enabled (Reloading)..."
    EXTRA_ARGS="--reload"
else
    EXTRA_ARGS=""
fi

exec uvicorn config.asgi:application --host 0.0.0.0 --port 8000 $EXTRA_ARGS --lifespan off