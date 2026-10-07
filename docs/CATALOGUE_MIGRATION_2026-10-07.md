# Catalogue migration — October 7, 2026

Copied all 26 published opportunity records from the configured Neon source into target Supabase project. Supabase previously had six demo seed records; those matching IDs were replaced by their source catalogue records, and 20 missing IDs were inserted. All 26 IDs and imported fields matched the source before the transaction committed.

The source was accessed only in a read-only transaction. No source records were modified. Two legacy creator references were retained in the private backup; the shared published listings have `created_by = null` because account identities are not migrated. User accounts, private saved work and applications were not transferred.

Verified ordinary authenticated Supabase Data API access returns the exact set of all 26 IDs. Temporary QA account was removed. Re-running the import inspection verifies existing records and refuses conflicting real destination content.

Availability limitations: four source deadlines have passed; all 26 records have no `last_verified_at`. Dates and existing source-status fields were preserved without inventing verification. Catalogue presence is not proof a programme is currently accepting applications.

Private source/destination-before backup: `~/.local/share/elara/backups/catalogue-2026-10-07/catalogue.json`, file mode 0600. No credentials are in that backup.

Runner: `scripts/migrate-catalogue-to-supabase.mjs`. Required environment names: `NEON_DATABASE_URL`, `CATALOGUE_SOURCE_EXPECTED_HOST`, `SUPABASE_DB_URL`, `NEXT_PUBLIC_SUPABASE_URL`. Default is inspection; `--apply` performs an atomic import after target/column/content checks. Do not rerun an import after destination edits without reviewing conflicts.

No push or application deployment occurred.
