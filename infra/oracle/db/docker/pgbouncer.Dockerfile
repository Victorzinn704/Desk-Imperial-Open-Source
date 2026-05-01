FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends pgbouncer postgresql-client gettext-base netcat-openbsd dumb-init \
  && rm -rf /var/lib/apt/lists/*

COPY oracle/db/docker/pgbouncer-entrypoint.sh /usr/local/bin/pgbouncer-entrypoint.sh

RUN chmod +x /usr/local/bin/pgbouncer-entrypoint.sh

ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/pgbouncer-entrypoint.sh"]
