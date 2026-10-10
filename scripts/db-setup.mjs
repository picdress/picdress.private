// DB 테이블 만들고 초기 드레스 데이터 넣기
// 사용법: DATABASE_URL=... npm run db:setup
// Vercel 배포(빌드) 때도 자동으로 실행돼요. 여러 번 실행해도 기존 데이터는 그대로예요.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

const here = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  if (process.argv.includes("--if-configured")) {
    console.log("DATABASE_URL이 없어서 DB 설정은 건너뛰어요.");
    process.exit(0);
  }
  console.error("DATABASE_URL 환경변수가 필요해요.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
try {
  for (const file of ["schema.sql", "seed.sql"]) {
    await sql.unsafe(readFileSync(join(here, "..", "db", file), "utf8"));
    console.log(`✓ ${file}`);
  }
  console.log("DB 준비 완료!");
} catch (e) {
  console.error("DB 설정 실패:", e.message);
  if (/password authentication failed/i.test(e.message)) {
    console.error("→ DATABASE_URL의 비밀번호가 틀렸어요. [YOUR-PASSWORD]를 대괄호까지 지우고 Supabase DB 비밀번호를 넣었는지 확인하세요.");
    console.error("→ 비밀번호가 기억 안 나면 Supabase → Project Settings → Database → Reset database password (영문·숫자만 쓰면 안전해요).");
  } else if (/ENOTFOUND|getaddrinfo|ECONNREFUSED|timeout/i.test(e.message)) {
    console.error("→ DB 주소에 연결할 수 없어요. Supabase의 Connect → Transaction pooler 주소(포트 6543)를 그대로 복사했는지 확인하세요.");
  }
  process.exitCode = 1;
} finally {
  await sql.end();
}
