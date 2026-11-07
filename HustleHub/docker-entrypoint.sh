#!/bin/sh
set -eu

source_dir=/app/certs
runtime_dir=/tmp/hustlehub-certs

mkdir -p "$runtime_dir"
cp "$source_dir/localhost-key.pem" "$runtime_dir/localhost-key.pem"
cp "$source_dir/localhost.pem" "$runtime_dir/localhost.pem"
chown -R hustlehub:hustlehub "$runtime_dir"
chmod 700 "$runtime_dir"
chmod 600 "$runtime_dir/localhost-key.pem"
chmod 644 "$runtime_dir/localhost.pem"

export TLS_CERT_DIR="$runtime_dir"
exec su-exec hustlehub:hustlehub "$@"
