\set bi_reader '__BI_DB_USER__'
\set migration_user '__MIGRATION_DB_USER__'

GRANT USAGE ON SCHEMA bi TO :"bi_reader";
GRANT SELECT ON ALL TABLES IN SCHEMA bi TO :"bi_reader";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_user" IN SCHEMA bi GRANT SELECT ON TABLES TO :"bi_reader";
