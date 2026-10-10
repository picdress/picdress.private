import { config } from "./config";
import { db, type Tx } from "./db";
import { isSlotClosedByTime, openDates, slotTimes, toMinutes } from "./time";

export type ActiveBooking = { id: string; slot_time: string; dress_id: string; dress_size: string };

/** 자리를 차지하고 있는 예약: 확정됐거나, 결제/입금 대기 중인데 아직 기한 안 지난 것 */
export async function activeBookingsOn(tx: Tx, date: string, excludeId?: string) {
  const rows = await tx<ActiveBooking[]>`
    select id, slot_time, dress_id, dress_size
    from bookings
    where slot_date = ${date}
      and (status = 'paid' or (status in ('holding', 'awaiting_deposit') and hold_expires_at > now()))
      ${excludeId ? tx`and id <> ${excludeId}` : tx``}
  `;
  return rows;
}

export type StockRow = { dress_id: string; size: string; quantity: number; sort: number };

export async function stockRows(tx: Tx) {
  return tx<StockRow[]>`
    select s.dress_id, s.size, s.quantity, s.sort
    from dress_stock s join dresses d on d.id = s.dress_id
    where d.active
    order by d.sort, s.sort
  `;
}

function overlaps(a: string, b: string) {
  return Math.abs(toMinutes(a) - toMinutes(b)) < config.rentalMinutes + config.dressBufferMinutes;
}

/** 특정 날짜·시간에 드레스·사이즈별로 남은 수량 */
export function dressRemaining(stock: StockRow[], active: ActiveBooking[], time: string) {
  const map = new Map<string, number>();
  for (const s of stock) {
    const used = active.filter(
      (b) => b.dress_id === s.dress_id && b.dress_size === s.size && overlaps(b.slot_time, time),
    ).length;
    map.set(`${s.dress_id}|${s.size}`, Math.max(0, s.quantity - used));
  }
  return map;
}

export type SlotInfo = {
  time: string;
  capacity: number;
  taken: number;
  /** 화면에 보여줄 남은 자리 (정원과 남은 드레스 수 중 작은 값) */
  remaining: number;
  closed: boolean;
};

type Override = { slot_time: string; capacity: number };

/** 이미 불러온 예약·재고·정원 정보로 그 날의 타임별 남은 자리를 계산 (DB 조회 없음) */
function computeSlots(date: string, active: ActiveBooking[], stock: StockRow[], overrides: Override[], now?: Date) {
  const ov = new Map(overrides.map((o) => [o.slot_time, o.capacity]));
  return slotTimes().map<SlotInfo>((time) => {
    const capacity = ov.get(time) ?? config.slotCapacity;
    const taken = active.filter((b) => b.slot_time === time).length;
    let dressesLeft = 0;
    for (const v of dressRemaining(stock, active, time).values()) dressesLeft += v;
    const remaining = Math.max(0, Math.min(capacity - taken, dressesLeft));
    const closed = capacity === 0 || isSlotClosedByTime(date, time, now);
    return { time, capacity, taken, remaining: closed ? 0 : remaining, closed };
  });
}

export async function daySlots(tx: Tx, date: string, opts: { excludeId?: string; now?: Date } = {}) {
  const active = await activeBookingsOn(tx, date, opts.excludeId);
  const stock = await stockRows(tx);
  const overrides = await tx<Override[]>`
    select slot_time, capacity from slot_overrides where slot_date = ${date}
  `;
  return computeSlots(date, active, stock, overrides, opts.now);
}

/** 한 타임에 예약을 하나 더 받을 수 있는지 + 그 드레스·사이즈가 남았는지 */
export async function canBook(
  tx: Tx,
  input: { date: string; time: string; dressId: string; size: string },
  excludeId?: string,
) {
  const slots = await daySlots(tx, input.date, { excludeId });
  const slot = slots.find((s) => s.time === input.time);
  if (!slot || slot.closed) return { ok: false as const, reason: "SLOT_CLOSED" };
  if (slot.taken >= slot.capacity) return { ok: false as const, reason: "SLOT_FULL" };

  const active = await activeBookingsOn(tx, input.date, excludeId);
  const stock = await stockRows(tx);
  const left = dressRemaining(stock, active, input.time).get(`${input.dressId}|${input.size}`) ?? 0;
  if (left <= 0) return { ok: false as const, reason: "DRESS_UNAVAILABLE" };
  return { ok: true as const };
}

export async function dateSummary() {
  // 날짜별로 예약 가능한 자리 합계 (달력 회색 처리용)
  // 날짜마다 따로 조회하지 않고, 영업 기간 전체를 쿼리 3번으로 불러와서 계산해요
  const sql = db();
  const dates = openDates();
  const out: Record<string, number> = {};
  if (dates.length === 0) return out;
  const first = dates[0];
  const last = dates[dates.length - 1];

  const active = await sql<(ActiveBooking & { slot_date: string })[]>`
    select id, slot_date, slot_time, dress_id, dress_size
    from bookings
    where slot_date between ${first} and ${last}
      and (status = 'paid' or (status in ('holding', 'awaiting_deposit') and hold_expires_at > now()))
  `;
  const stock = await stockRows(sql);
  const overrides = await sql<(Override & { slot_date: string })[]>`
    select slot_date, slot_time, capacity from slot_overrides where slot_date between ${first} and ${last}
  `;

  for (const d of dates) {
    const slots = computeSlots(
      d,
      active.filter((b) => b.slot_date === d),
      stock,
      overrides.filter((o) => o.slot_date === d),
    );
    out[d] = slots.reduce((n, s) => n + s.remaining, 0);
  }
  return out;
}
