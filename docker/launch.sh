#!/bin/bash

POSTGRES_DIRECTORY="$(pwd)/postgres_data";

if [ ! -d "$POSTGRES_DIRECTORY" ]; then
    mkdir -p $POSTGRES_DIRECTORY;
fi

if [ -z `docker-compose ps -q cqdg-data-submission-postgres` ] || [ -z `docker ps -q --no-trunc | grep $(docker-compose ps -q cqdg-data-submission-postgres)` ]; then
    docker-compose up -d;
    sleep 2;
fi
