CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE SCHEMA IF NOT EXISTS pgbouncer;

CREATE OR REPLACE FUNCTION pgbouncer.get_auth(IN p_usename text, OUT usename text, OUT passwd text)
RETURNS record
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT rolname::text, rolpassword::text
  FROM pg_authid
  WHERE rolname = p_usename;
$$;

REVOKE ALL ON SCHEMA pgbouncer FROM PUBLIC;
REVOKE ALL ON FUNCTION pgbouncer.get_auth(text) FROM PUBLIC;
