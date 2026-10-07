import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

type SqlRow = import('pg').QueryResultRow;
let pool: Pool | undefined;

export function createSql() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('Supabase database credentials are not configured.');
  pool ||= new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10000 });
  const query = async (text: string, values: unknown[] = []): Promise<SqlRow[]> => (await pool!.query(text, values)).rows as SqlRow[];
  const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.reduce((queryText, part, index) => queryText + (index ? `$${index}${part}` : part), '');
    return query(text, values);
  };
  return Object.assign(sql, { query });
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service credentials are not configured.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
