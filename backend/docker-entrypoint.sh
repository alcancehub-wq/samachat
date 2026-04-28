#!/bin/sh
set -e

echo "Waiting for database at tcp://${DB_HOST}:3306"
dockerize -wait tcp://${DB_HOST}:3306

echo "Migration status (before)"
npx sequelize db:migrate:status

echo "Running migrations"
npx sequelize db:migrate

echo "Migration status (after)"
npx sequelize db:migrate:status

echo "Starting backend"
exec node dist/server.js
