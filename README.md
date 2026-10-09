# pic.dress 예약 사이트

이화 드레스 투어 **pic.dress** 예약·결제·관리자 사이트예요. 피그마(`pic.dress` 파일) 디자인을 그대로 옮겼어요.

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
- **결제**: 토스페이먼츠 결제창에서 인증 → 서버에서 금액을 다시 검증하고 승인 API 호출 → 그때 실제 결제가 완료되고 예약 확정 메일이 나가요.
- **환불**: 고객이 메일 링크에서 직접 취소하면 환불 규정(`REFUND_RULES`)대로 자동 환불돼요. 관리자는 금액을 정해서 전액/부분 환불할 수 있어요.
- **무통장입금 모드** (`PAYMENT_MODE=manual`): 사업자 없이 운영할 때. 고객이 신청 → 관리자가 "입금 확인" → 예약 확정 메일.

## 배포하기 (처음 한 번)

필요한 계정: GitHub, Vercel, Supabase, 토스페이먼츠, Gmail. 전부 본인 명의로 만들어 주세요.

1. **Supabase** (DB)
   - 새 프로젝트 만들기 (지역: Seoul)
   - 상단 **Connect** → **Transaction pooler** 주소 복사 → `[YOUR-PASSWORD]`를 프로젝트 비밀번호로 바꿔서 `DATABASE_URL`
   - 테이블은 배포할 때 자동으로 만들어져요 (`db/schema.sql`, `db/seed.sql`)
2. **토스페이먼츠** (결제)
   - 개발자센터에 이메일로 가입 → API 키 → **API 개별 연동 키**의 테스트 키(`test_ck_…`, `test_sk_…`) 복사
3. **Gmail** (확인 메일)
   - picdress012@gmail.com 에서 2단계 인증 켜기 → 앱 비밀번호 만들기 → `GMAIL_APP_PASSWORD`
4. **GitHub**에 이 폴더를 올리고 → **Vercel**에서 Import
5. Vercel → Settings → Environment Variables에 `.env.example`의 값들을 채워 넣고 Deploy
   - `SITE_URL`은 비워두면 Vercel 기본 주소를 써요. 도메인을 따로 연결하면 그 주소를 넣어주세요.
   - `ADMIN_PASSWORD`, `SESSION_SECRET`은 길고 랜덤하게
   - `PAYMENT_MOCK`은 **비워두세요**

### 배포 후 확인
- [ ] 홈에서 예약하기 → 끝까지 테스트 결제 (테스트 키라 실제 돈은 안 빠져요)
- [ ] 확인 메일이 오는지, 메일의 "예약 확인 · 취소"로 취소하면 환불되는지
- [ ] `/admin` 로그인 → 예약이 보이는지, 타임 마감/열기, 드레스 가격·수량 수정
- [ ] 토스페이먼츠 개발자센터 → 테스트 결제 내역에 결제·취소가 찍히는지

## 실제 결제로 바꾸기

1. 사업자등록 (개인사업자) → 통신판매업 신고
2. 토스페이먼츠 전자결제 신청 (개인사업자는 **퀵오픈**으로 심사 결과를 기다리지 않고 결제 시작 가능)
3. 라이브 키(`live_ck_…`, `live_sk_…`)로 `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY` 교체
4. `BUSINESS_NAME`, `BUSINESS_OWNER`, `BUSINESS_REG_NO`, `BUSINESS_MAIL_ORDER_NO` 채우기 (사이트 하단·약관에 표시, PG 심사에서 확인해요)
5. PayPal은 토스페이먼츠 **해외 간편결제** 계약이 따로 필요해요. 관리자 화면에서 드레스별 달러 가격을 넣으면 결제 화면에 PayPal이 나타나요.

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
| `public/images/pay/*.png` | 결제수단 로고 (토스페이·카카오페이·PayPal) | 가로형 |

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
| `PAYMENT_MODE` | toss | `manual`이면 무통장입금 |

## 로컬에서 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기 (로컬은 PAYMENT_MOCK=1 로 모의결제 가능)
npm run db:setup
npm run dev                  # http://localhost:3000
```

## 구성

Next.js 16 (App Router) · PostgreSQL (`postgres`) · 토스페이먼츠 SDK v2 · Nodemailer(Gmail)
글꼴: 아리따 부리(아모레퍼시픽), 을유1945 — `public/fonts`에 포함
