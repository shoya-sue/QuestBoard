#!/bin/sh
echo "Starting Quest Board backend..."
echo "NODE_ENV: ${NODE_ENV}"
echo "PORT: ${PORT}"
echo "DB_HOST: ${DB_HOST}"
echo "DB_PORT: ${DB_PORT}"
echo "DB_NAME: ${DB_NAME}"
echo "DB_USER: ${DB_USER}"

# Wait for database to be ready
echo "Waiting for database..."
until nc -z -v -w30 ${DB_HOST:-localhost} ${DB_PORT:-5432}
do
  echo "Waiting for database connection..."
  sleep 5
done
echo "Database is ready!"

# Run migrations (don't fail if already migrated)
echo "Running database migrations..."
npx sequelize-cli db:migrate || echo "Migration check completed"

# Start the application
echo "Starting application..."
cd /app
exec node src/app.js