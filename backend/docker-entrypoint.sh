#!/bin/sh
set -e

echo "Waiting for database at tcp://${DB_HOST}:3306"
dockerize -wait tcp://${DB_HOST}:3306

echo "Running migrations"
if ! npx sequelize db:migrate; then
  echo "Migration failed; starting app anyway"
fi

echo "Starting backend"
exec node dist/server.js
