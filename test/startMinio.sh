#!/bin/sh
docker run \
    -e "MINIO_ACCESS_KEY=minio" \
    -e "MINIO_SECRET_KEY=minio123" \
    -p 9001:9000 \
    --name "jest_minio" \
    --rm \
    minio/minio \
        server /data
