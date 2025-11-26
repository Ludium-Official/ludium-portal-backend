#!/usr/bin/env bash

set -euo pipefail

# echo "[1/3] Preparing database..."
# npm run migrate:db
if [ "${DB_NAME}" -eq "ludium" ]; then
    echo "set db name to ludium"
    exit 1;
fi

npm run db:gen
npm run db:migrate

# echo "[2/3] Migrating core reference data..."
npm run migrate:users
npm run migrate:networks
npm run migrate:tokens
npm run migrate:sm

# echo "[3/3] Migrating domain data..."
npm run migrate:programs
npm run migrate:opinfo
npm run migrate:applications
npm run migrate:milestones

echo "✅ All migrations completed successfully."