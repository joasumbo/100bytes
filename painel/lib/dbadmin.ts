import { Pool } from "pg";

// Alvos permitidos: loja (bytes) e painel (vercel_100).
const TARGETS: Record<string, { label: string; url: string | undefined }> = {
  loja: { label: "Loja (bytes)", url: process.env.STORE_DATABASE_URL },
  painel: { label: "Painel (vercel_100)", url: process.env.DATABASE_URL },
};

const pools: Record<string, Pool> = {};

function pool(target: string): Pool {
  const t = TARGETS[target];
  if (!t?.url) throw new Error(`alvo inválido: ${target}`);
  if (!pools[target]) pools[target] = new Pool({ connectionString: t.url, max: 2 });
  return pools[target];
}

export function targets() {
  return Object.entries(TARGETS)
    .filter(([, v]) => v.url)
    .map(([k, v]) => ({ key: k, label: v.label }));
}

export type TableInfo = { table: string; rows: number; bytes: number; columns: number };

export async function listTables(target: string): Promise<TableInfo[]> {
  const p = pool(target);
  const { rows } = await p.query(`
    SELECT c.relname AS table,
           COALESCE(s.n_live_tup, 0)::bigint AS rows,
           pg_total_relation_size(c.oid)::bigint AS bytes,
           (SELECT count(*) FROM information_schema.columns col
             WHERE col.table_schema='public' AND col.table_name=c.relname)::int AS columns
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_stat_user_tables s ON s.relid=c.oid
    WHERE n.nspname='public' AND c.relkind='r'
    ORDER BY c.relname
  `);
  return rows.map((r) => ({ table: r.table, rows: Number(r.rows), bytes: Number(r.bytes), columns: r.columns }));
}

export type Column = { name: string; type: string; nullable: boolean; default: string | null };

async function validTable(target: string, table: string): Promise<boolean> {
  const p = pool(target);
  const { rows } = await p.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    [table]
  );
  return rows.length > 0;
}

export async function tableDetail(target: string, table: string, page = 0, pageSize = 50) {
  if (!(await validTable(target, table))) throw new Error("tabela inexistente");
  const p = pool(target);

  const cols = await p.query(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [table]
  );
  const columns: Column[] = cols.rows.map((c) => ({
    name: c.column_name,
    type: c.data_type,
    nullable: c.is_nullable === "YES",
    default: c.column_default,
  }));

  const cnt = await p.query(`SELECT count(*)::bigint AS n FROM public."${table}"`);
  const total = Number(cnt.rows[0].n);

  const offset = page * pageSize;
  const data = await p.query(`SELECT * FROM public."${table}" LIMIT ${pageSize} OFFSET ${offset}`);
  const rows = data.rows.map(sanitize);

  return { columns, rows, total, page, pageSize };
}

// Converte valores não-serializáveis (BigInt, Date, objetos) para JSON-safe.
function sanitize(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "bigint") out[k] = v.toString();
    else if (v instanceof Date) out[k] = v.toISOString();
    else if (v && typeof v === "object") out[k] = JSON.stringify(v);
    else out[k] = v;
  }
  return out;
}
