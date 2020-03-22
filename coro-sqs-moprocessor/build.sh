#!/bin/bash

ms="coro-sqs-moprocessor"
branch=$1
coroliblayer=$(aws s3 cp --quiet s3://coro-layers/coro-lib-layer.txt /dev/stdout)
coropropertieslayer=$(aws s3 cp --quiet s3://coro-layers/coro-properties-layer.txt /dev/stdout)
echo "THE LAYERS: $coropropertieslayer,$coroliblayer"
claudia update --version $1 --set-env alias=$1,GOOGLE_APPLICATION_CREDENTIAL_customerBot="/opt/nodejs/coro-customer-78e0bde4e41b.json" --no-optional-dependencies --layers $coropropertieslayer,$coroliblayer

commiter=$(git log --format='%ae' | head -1)

curl -X POST \
     -H 'Content-Type: application/json' \
     -d "{\"chat_id\": \"-252595147\", \"text\": \"${ms}:${branch} updated by ${commiter}\", \"disable_notification\": false}" \
     https://api.telegram.org/bot942818717:AAGju9x1WhI8grWMbS7WcCwGLFyPQJrMnlI/sendMessage