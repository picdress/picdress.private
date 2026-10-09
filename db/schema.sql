-- pic.dress 예약 시스템 DB 구조
-- 여러 번 실행해도 안전해요 (if not exists).

create extension if not exists pgcrypto;

-- 드레스
create table if not exists dresses (
  id          text primary key,              -- 예: green-tinkerbell
  name        text not null,
  price       integer not null check (price >= 0),          -- 원
  price_usd   numeric(10,2),                 -- PayPal 결제 금액(달러). 비우면 PayPal 숨김
  image       text not null,                 -- /images/dresses/xxx.jpg
  model_size  text,                          -- 모델 착용 사이즈
  model_spec  text,                          -- 모델 스펙
  sort        integer not null default 0,
  active      boolean not null default true
);

-- 드레스 사이즈별 보유 수량
create table if not exists dress_stock (
  dress_id  text not null references dresses(id) on delete cascade,
  size      text not null,
  quantity  integer not null default 1 check (quantity >= 0),
  sort      integer not null default 0,
  primary key (dress_id, size)
);

-- 타임별 정원 예외 (0 = 마감/휴무). 없으면 기본 정원(SLOT_CAPACITY)
create table if not exists slot_overrides (
  slot_date  date not null,
  slot_time  text not null,
  capacity   integer not null check (capacity >= 0),
  primary key (slot_date, slot_time)
);

-- 예약
--  holding          : 결제 화면에서 자리를 잠깐 잡아둔 상태 (hold_expires_at까지)
--  awaiting_deposit : 무통장입금 대기 (hold_expires_at이 입금 기한)
--  paid             : 결제/입금 완료 → 예약 확정
--  cancelled        : 취소 (refund_amount만큼 환불)
--  expired          : 시간 초과로 자동 해제
create table if not exists bookings (
  id                  uuid primary key default gen_random_uuid(),
  order_id            text not null unique,
  manage_token        text not null unique,
  customer_name       text not null,
  phone               text not null,
  email               text not null,
  slot_date           date not null,
  slot_time           text not null,
  dress_id            text not null references dresses(id),
  dress_size          text not null,
  amount              integer not null,
  amount_usd          numeric(10,2),
  currency            text not null default 'KRW',
  status              text not null check (status in ('holding','awaiting_deposit','paid','cancelled','expired')),
  payment_mode        text not null,          -- toss | manual | mock
  payment_method      text,                   -- TOSSPAY | KAKAOPAY | TRANSFER | PAYPAL | BANK
  payment_key         text,
  hold_expires_at     timestamptz,
  paid_at             timestamptz,
  cancelled_at        timestamptz,
  cancelled_by        text,                   -- customer | admin | system
  refund_amount       integer not null default 0,
  refund_reason       text,
  refund_done_at      timestamptz,            -- 무통장입금 환불을 직접 송금한 시각
  admin_memo          text,
  client_ip           text,
  created_at          timestamptz not null default now()
);

create index if not exists bookings_slot_idx on bookings (slot_date, slot_time);
create index if not exists bookings_status_idx on bookings (status);
create index if not exists bookings_phone_idx on bookings (phone);

-- 결제·환불 기록 (문제 생겼을 때 추적용)
create table if not exists booking_events (
  id          bigserial primary key,
  booking_id  uuid references bookings(id) on delete cascade,
  type        text not null,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists booking_events_booking_idx on booking_events (booking_id);

-- ── 다국어 / 해외결제 추가 (2026-10) ──
alter table dresses  add column if not exists name_en text;
alter table dresses  add column if not exists name_zh text;
alter table bookings add column if not exists locale text not null default 'ko';
alter table bookings add column if not exists payment_channel text;   -- kr | global
