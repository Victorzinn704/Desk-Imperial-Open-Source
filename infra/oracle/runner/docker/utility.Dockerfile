FROM postgres:17-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends pgbackrest pgbadger ca-certificates \
  && rm -rf /var/lib/apt/lists/*
