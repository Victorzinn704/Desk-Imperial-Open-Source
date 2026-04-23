FROM postgres:17-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends pgbackrest postgresql-contrib ca-certificates \
  && rm -rf /var/lib/apt/lists/*
