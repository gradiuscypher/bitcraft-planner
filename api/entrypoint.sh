#!/bin/bash
set -e

echo "Starting Bitcraft API..."

# Run database migrations
#echo "Running database migrations..."
#python migrate.py upgrade

# Check if migrations were successful
# if [ $? -eq 0 ]; then
#     echo "Migrations completed successfully!"
# else
#     echo "Migration failed! Exiting..."
#     exit 1
# fi

echo "Starting API server in production mode..."
exec uv run fastapi run api.py --host 0.0.0.0