declare module 'pg' {
  export interface QueryResultRow {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [column: string]: any;
  }

  export class Pool {
    constructor(options: { connectionString: string; max?: number; connectionTimeoutMillis?: number });
    query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<{ rows: R[] }>;
  }
}
