#!/bin/bash

POSTGRES_DIRECTORY="$(pwd)/postgres_data";
MINIO_DIRECTORY="$(pwd)/minio_data";

if [ ! -d "$POSTGRES_DIRECTORY" ]; then
    mkdir -p $POSTGRES_DIRECTORY;
fi

if [ ! -d "$MINIO_DIRECTORY" ]; then
    mkdir -p $MINIO_DIRECTORY;
fi

if [ -z `docker-compose ps -q cqdg-data-submission-postgres` ] || [ -z `docker ps -q --no-trunc | grep $(docker-compose ps -q cqdg-data-submission-postgres)` ]; then
    docker-compose up -d --remove-orphans;
    sleep 2;
fi
