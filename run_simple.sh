#! /usr/bin/env bash

if [[ -z "${TURSO_ORG:=}" ]]; then
  echo "No TURSO_ORG environment variable available, bailing"
  exit 1
fi

if [[ -z "${TURSO_MANAGEMENT_TOKEN:=}" ]]; then
  echo "No TURSO_ORG environment variable available, bailing"
  exit 1
fi

# should be 20 something
node -v

export TURSO_GROUP=my-simple-debug
export TURSO_SCHEMA_DB=my-simple-debug

export TURSO_CONNECTION_URL=libsql://${TURSO_SCHEMA_DB}-${TURSO_ORG}.turso.io

# setup stuff
turso group create ${TURSO_GROUP} --location fra
turso db create ${TURSO_SCHEMA_DB} --group ${TURSO_GROUP} --type schema

export TURSO_AUTH_TOKEN=$(turso group tokens create ${TURSO_GROUP})

node ./index.mjs
