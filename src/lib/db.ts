import postgres from "postgres";

// Supabase / Neon 등 어떤 Postgres든 DATABASE_URL 하나로 연결해요.
// Supabase 풀러(6543 포트)를 써도 되도록 prepare: false.

const globalForSql = globalThis as unknown as { __pdSql?: postgres.Sql };

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 환경변수가 없어요. .env.example을 참고해 설정해 주세요.");
  return postgres(url, {
    max: 5,
    prepare: false,
    idle_timeout: 20,
    // date 타입은 "YYYY-MM-DD" 문자열 그대로 받기
    types: {
      date: {
        to: 1082,
        from: [1082],
        serialize: (x: string) => x,
        parse: (x: string) => x,
      },
    },
  });
}

export function db(): postgres.Sql {
  if (!globalForSql.__pdSql) globalForSql.__pdSql = create();
  return globalForSql.__pdSql;
}

export type Tx = postgres.TransactionSql | postgres.Sql;
