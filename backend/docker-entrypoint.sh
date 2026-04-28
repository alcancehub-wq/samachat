#!/bin/sh
set -e

echo "Waiting for database at tcp://${DB_HOST}:3306"
dockerize -wait tcp://${DB_HOST}:3306

echo "Migration status (before)"
npx sequelize db:migrate:status

echo "Running migrations"
if npx sequelize db:migrate; then
	echo "Migration status (after)"
	npx sequelize db:migrate:status
	export RUN_WORKERS=true
else
	echo "Migration failed; workers disabled"
	export RUN_WORKERS=false
fi

echo "Starting backend"
exec node dist/server.js
