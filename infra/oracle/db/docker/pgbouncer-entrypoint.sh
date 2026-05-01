#!/bin/sh
set -eu

envsubst < /etc/pgbouncer/pgbouncer.ini.template > /etc/pgbouncer/pgbouncer.ini
chmod 0644 /etc/pgbouncer/pgbouncer.ini

cat > /etc/pgbouncer/userlist.txt <<EOF
"${PGBOUNCER_AUTH_USER}" "${PGBOUNCER_AUTH_PASSWORD}"
EOF
chmod 0600 /etc/pgbouncer/userlist.txt

exec su -s /bin/sh -c "exec pgbouncer /etc/pgbouncer/pgbouncer.ini" postgres
