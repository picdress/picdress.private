# pic.dress 예약 사이트

이화 드레스 투어 **pic.dress** 예약·결제·관리자 사이트예요. 피그마(`pic.dress` 파일) 디자인을 그대로 옮겼어요.
고객 화면은 **한국어 · English · 中文(简体)** 를 지원하고, 국내·해외 결제를 모두 받아요.

| 화면 | 주소 |
|---|---|
| 홈 (소개 · 프로그램 · 드레스 컬렉션 · 제휴사) | `/` |
| 예약자 정보 → 날짜·시간 → 드레스 → 사이즈 → 결제 | `/reserve` ~ `/reserve/payment` |
| 결제 완료 / 예약 확인·취소 (메일 링크) | `/booking/{토큰}` |
| 이용약관 · 취소·환불 규정 · 개인정보처리방침 | `/policy` |
| **관리자** (예약 현황, 입금 확인, 취소·환불, 타임 마감, 드레스 가격·수량) | `/admin` |

## 어떻게 동작하나요

- **타임별 정원 4명**: 같은 날짜 예약은 DB에서 한 번에 하나씩 처리해서, 여러 명이 동시에 눌러도 4명을 넘지 않아요.
- **드레스 재고**: 대여가 2시간이라 같은 드레스·사이즈는 겹치는 시간에 보유 수량만큼만 예약돼요. 화면의 "n자리 남음"은 정원과 남은 드레스 중 작은 값이에요.
- **자리 잡기**: 결제 화면에 들어오면 10분 동안 자리를 잡아둬요. 결제를 안 하면 자동으로 풀려요.
- **언어**: 폰 언어에 맞춰 자동으로 고르고, 상단 KO / EN / 中文 버튼으로 바꿀 수 있어요. 홍보 링크에 `?lang=zh`(또는 `en`, `ko`)를 붙이면 그 언어로 열려요. 확인 메일도 예약한 언어로 가요. 관리자 화면은 한국어예요.
- **결제 — 지금 방식 (사업자 없이, `PAYMENT_MODE=manual`)**
  - 결제수단: **토스 송금 · 카카오페이 송금 · 계좌이체 · PayPal** (+ 선택: 현장 결제)
  - 손님이 결제수단을 골라 신청하면 자리가 잡히고, 금액과 송금 링크가 화면과 메일로 안내돼요. PayPal은 달러 금액이 채워진 링크로 열려요.
  - 송금이 들어오면 관리자 화면에서 **'결제 확인'** → 확정 메일. 기한(기본 2시간) 안에 송금이 없으면 자리가 자동으로 풀려요.
  - 환불은 관리자가 받은 방법으로 직접 돌려보내고 '환불 송금 완료'를 눌러요 (PayPal은 PayPal 거래 내역에서 Refund).
  - 토스·카카오페이 송금은 한국 계좌가 있어야 해서, 외국인 화면에서는 PayPal·현장 결제가 먼저 보여요.
- **결제 — 나중에 사업자 등록하면 (`PAYMENT_MODE=online`)** 포트원 하나로 두 결제사 연결
  - 국내: 토스페이먼츠 → 토스페이 · 카카오페이 · 계좌이체 · 카드
  - 해외: 엑심베이 → 알리페이 · 위챗페이 · 유니온페이 · 해외카드(Visa·Master·JCB·Amex) · PayPal (결제창도 중국어·영어로 떠요)
  - 결제가 끝나면 서버가 포트원에 실제 결제 내역을 조회해 금액과 자리를 다시 확인해요. 금액이 다르거나, 결제하는 사이 자리가 마감됐으면 **자동으로 결제를 취소(환불)** 해요.
  - 고객이 결제 직후 창을 닫아도 포트원 웹훅으로 예약이 확정돼요.
- **환불**: 고객이 메일 링크에서 직접 취소하면 환불 규정(`REFUND_RULES`)대로 자동 환불돼요. 관리자는 금액을 정해서 전액/부분 환불할 수 있어요.
- **무통장입금 모드** (`PAYMENT_MODE=manual`): 사업자 없이 운영할 때. 고객이 신청 → 관리자가 "입금 확인" → 예약 확정 메일.

## 배포하기 (처음 한 번)

필요한 계정: GitHub, Vercel, Supabase, 포트원, 토스페이먼츠, (해외결제) 엑심베이, Gmail. 전부 본인 명의로 만들어 주세요.

1. **Supabase** (DB)
   - 새 프로젝트 만들기 (지역: Seoul)
   - 상단 **Connect** → **Transaction pooler** 주소 복사 → `[YOUR-PASSWORD]`를 프로젝트 비밀번호로 바꿔서 `DATABASE_URL`
   - 테이블은 배포할 때 자동으로 만들어져요 (`db/schema.sql`, `db/seed.sql`)
2. **결제 링크** (지금 방식)
   - 토스 · 카카오페이 → 따로 할 것 없음. `BANK_ACCOUNT`(아래)를 넣으면 각 버튼이 우리 계좌·금액이 채워진 토스/카카오페이 송금 화면을 열어요 (휴대폰 앱)
   - PayPal → PayPal.Me 링크 만들기 → `PAYPAL_LINK`
   - 계좌이체 → `BANK_ACCOUNT`에 `은행 계좌번호 (예금주 이름)` 형태로 (예약 화면에 복사 버튼이 붙어요)
   - 관리자 화면 > 드레스 관리에서 드레스별 달러 가격을 넣어두면 PayPal 금액으로 써요 (없으면 `KRW_PER_USD` 환율로 계산)
3. (사업자 등록 후) **포트원** — [admin.portone.io](https://admin.portone.io)
   - 결제 연동 → **테스트** 상태에서 채널 추가
     - 토스페이먼츠 채널 (토스페이먼츠 개발자센터의 테스트 키 입력) → 채널 키를 `PORTONE_CHANNEL_KR`
     - 엑심베이 V2 채널 (엑심베이 계약/테스트 정보 필요) → 채널 키를 `PORTONE_CHANNEL_GLOBAL`
   - 연동 정보에서 상점 아이디(`store-…`) → `PORTONE_STORE_ID`, V2 API Secret 발급 → `PORTONE_API_SECRET`
   - 웹훅: URL `https://사이트주소/api/payments/webhook` 등록 → 웹훅 시크릿을 `PORTONE_WEBHOOK_SECRET`
   - 콘솔 메뉴 이름은 조금 다를 수 있어요. 채널이 하나만 있으면 그 결제 묶음만 화면에 보여요.
4. **Gmail** (확인 메일)
   - picdress012@gmail.com 에서 2단계 인증 켜기 → 앱 비밀번호 만들기 → `GMAIL_APP_PASSWORD`
5. **GitHub**에 이 폴더를 올리고 → **Vercel**에서 Import
6. Vercel → Settings → Environment Variables에 `.env.example`의 값들을 채워 넣고 Deploy
   - `SITE_URL`은 비워두면 Vercel 기본 주소를 써요. 도메인을 따로 연결하면 그 주소를 넣어주세요.
   - `ADMIN_PASSWORD`, `SESSION_SECRET`은 길고 랜덤하게
   - `PAYMENT_MOCK`은 **비워두세요**

### 배포 후 확인
- [ ] 홈에서 예약하기 → 결제수단 고르고 신청 → 안내 화면의 송금 링크가 내 토스·카카오페이·PayPal로 열리는지
- [ ] 관리자 화면에서 '결제 확인' → 확정 메일이 오는지, 메일의 "예약 확인 · 취소"로 취소되는지
- [ ] `/admin` 로그인 → 예약이 보이는지, 타임 마감/열기, 드레스 가격·수량 수정
- [ ] 언어를 中文 / EN으로 바꿔서 같은 흐름이 되는지, 결제창이 그 언어로 뜨는지

## 나중에 사업자 등록 후 자동 결제로 바꾸기 (`PAYMENT_MODE=online`)

1. 사업자등록 (개인사업자) → 통신판매업 신고
2. 토스페이먼츠 전자결제 신청 (개인사업자는 **퀵오픈**으로 심사 결과를 기다리지 않고 결제 시작 가능), 엑심베이 해외결제 계약 신청
3. 포트원 콘솔에서 **실 연동** 채널을 추가하고, 새 채널 키로 `PORTONE_CHANNEL_KR` / `PORTONE_CHANNEL_GLOBAL` 교체
4. `BUSINESS_NAME`, `BUSINESS_OWNER`, `BUSINESS_REG_NO`, `BUSINESS_MAIL_ORDER_NO` 채우기 (사이트 하단·약관에 표시, PG 심사에서 확인해요)
5. 해외결제는 기본으로 원화(KRW)로 청구돼요. 엑심베이에서 원화 청구가 안 된다고 하면 `GLOBAL_CURRENCY=USD`로 바꾸고 관리자 화면에서 드레스별 달러 가격을 넣어주세요.

> 중국 손님: 중국 통신사 로밍으로 접속하면 일부 해외 서비스 주소가 막히는 경우가 있어요. 오픈 전에 중국 유심(로밍) 폰으로 사이트와 결제창이 열리는지 꼭 한 번 확인하고, 가능하면 `.vercel.app` 대신 직접 산 도메인을 연결하는 걸 추천해요.

> `/policy`의 약관·환불 규정·개인정보처리방침은 기본 틀이에요. 운영 전에 실제 운영 방식에 맞게 한 번 확인해 주세요.

## 사진 바꾸기

지금은 자리표시 이미지예요. 피그마에서 각 이미지 레이어를 PNG/JPG로 내보내서 같은 이름으로 덮어쓰면 돼요.

| 파일 | 피그마 위치 | 비율 |
|---|---|---|
| `public/images/logo.png` | 로고 (헤더·푸터) | 1:1 |
| `public/images/hero.jpg` | 홈 메인 사진 (실외 이화동산) | 402×607 |
| `public/images/program.jpg` | TOUR PROGRAM 사진 | 230×167 |
| `public/images/coupon-1~3.png` | 팝업 쿠폰 01·02·03 | 약 16:10 |
| `public/images/collection/1~7.jpg` | DRESS COLLECTION 사진 | 104×131 |
| `public/images/partners/1~3.jpg` | 제휴사 사진 | 1:1 |
| `public/images/dresses/*.jpg` | 드레스 선택 사진 | 238×320 |
| `public/images/pay/*.png` | 결제수단 로고 (토스페이·카카오페이·PayPal). 알리페이·위챗페이·유니온페이·해외카드는 글자로 표시 | 가로형 |

## 운영 설정 (환경변수)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `OPEN_START` / `OPEN_END` | 2026-11-02 / 2026-11-13 | 영업 기간 |
| `CLOSED_DATES` | (없음) | 휴무일, 쉼표로 구분 |
| `SLOT_START` / `SLOT_END` / `SLOT_INTERVAL_MINUTES` | 11:00 / 18:00 / 30 | 예약 시작 시간 목록 |
| `SLOT_CAPACITY` | 4 | 타임당 정원 (관리자 화면에서 타임별로 바꿀 수 있어요) |
| `RENTAL_MINUTES` / `DRESS_BUFFER_MINUTES` | 120 / 0 | 드레스 겹침 계산 (대여 + 정리 시간) |
| `BOOKING_CUTOFF_MINUTES` | 30 | 시작 몇 분 전까지 예약·취소 가능 |
| `HOLD_MINUTES` | 10 | 결제 화면에서 자리 잡아두는 시간 |
| `REFUND_RULES` | `3:100,1:50,0:0` | 이용일까지 남은 일수:환불% |
| `PAYMENT_MODE` | toss | `manual`이면 무통장입금 (해외 손님 결제 불가) |
| `GLOBAL_CURRENCY` | KRW | 해외결제 청구 통화 (KRW / USD) |

## 로컬에서 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기 (로컬은 PAYMENT_MOCK=1 로 모의결제 가능)
npm run db:setup
npm run dev                  # http://localhost:3000
```

## 구성

Next.js 16 (App Router) · PostgreSQL (`postgres`) · 포트원 V2 (`@portone/browser-sdk`, `@portone/server-sdk`) · Nodemailer(Gmail)
문구: `src/i18n/messages/{ko,en,zh}.ts` — 문구를 고치려면 이 파일들만 바꾸면 돼요.
글꼴: 아리따 부리(아모레퍼시픽), 을유1945 — `public/fonts`에 포함
