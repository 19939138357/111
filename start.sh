#!/bin/bash

set -e

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "Initializing PostgreSQL data directory..."
  su - postgres -c "/usr/lib/postgresql/15/bin/initdb -D $PGDATA"
  
  echo "Configuring PostgreSQL authentication..."
  echo "host all all 0.0.0.0/0 md5" >> $PGDATA/pg_hba.conf
  echo "host all all ::1/128 md5" >> $PGDATA/pg_hba.conf
  echo "listen_addresses='*'" >> $PGDATA/postgresql.conf
fi

echo "Starting PostgreSQL..."
su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PGDATA -w start"

sleep 2

echo "Checking if database and user exist..."
su - postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='library_user'\"" | grep -q 1 || \
  su - postgres -c "psql -c \"CREATE USER library_user WITH PASSWORD 'library_password'\""

su - postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='library_db'\"" | grep -q 1 || \
  su - postgres -c "psql -c \"CREATE DATABASE library_db OWNER library_user\""

su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE library_db TO library_user\""

echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
  if su - postgres -c "pg_isready -U library_user -d library_db" 2>/dev/null; then
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 1
done

cd /app

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx prisma db seed

echo "Initializing git baseline..."
if [ ! -d ".git" ]; then
  git config --global user.email "docker@local"
  git config --global user.name "Docker"
  git init
  git add .
  git commit -m "initial baseline"
fi

echo "Starting application..."
npm start
