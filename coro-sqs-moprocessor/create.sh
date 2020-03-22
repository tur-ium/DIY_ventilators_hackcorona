#!/bin/bash

branch=$1
coroliblayer=$(aws s3 cp --quiet s3://coro-layers/coro-lib-layer.txt /dev/stdout)
coropropertieslayer=$(aws s3 cp --quiet s3://coro-layers/coro-properties-layer.txt /dev/stdout)
echo "THE LAYERS: $coropropertieslayer,$coroliblayer"
claudia create --region ap-southeast-1 --set-env alias=aspen-kiwi --role arn:aws:iam::453216007638:role/coro-lambda-executor --version aspen-kiwi --no-optional-dependencies --handler lambda.handler --layers $coropropertieslayer,$coroliblayer