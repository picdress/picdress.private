import { activeBookingsOn, dressRemaining, stockRows } from "./availability";
import { db } from "./db";

export type DressSize = { size: string; quantity: number; remaining: number | null };
export type Dress = {
  id: string;
  name: string;
  price: number;
  priceUsd: string | null;
  image: string;
  modelSize: string | null;
  modelSpec: string | null;
  active: boolean;
  sizes: DressSize[];
};

type DressRow = {
  id: string;
  name: string;
  price: number;
  price_usd: string | null;
  image: string;
  model_size: string | null;
  model_spec: string | null;
  active: boolean;
};

/** 드레스 목록. date/time을 주면 그 시간에 사이즈별로 남은 수량도 계산 */
export async function listDresses(opts: { date?: string; time?: string; includeInactive?: boolean } = {}) {
  const sql = db();
  const dresses = await sql<DressRow[]>`
    select id, name, price, price_usd, image, model_size, model_spec, active
    from dresses ${opts.includeInactive ? sql`` : sql`where active`}
    order by sort, name
  `;
  const stock = await sql<{ dress_id: string; size: string; quantity: number; sort: number }[]>`
    select dress_id, size, quantity, sort from dress_stock order by sort
  `;
  let remaining: Map<string, number> | null = null;
  if (opts.date && opts.time) {
    const [active, activeStock] = await Promise.all([activeBookingsOn(sql, opts.date), stockRows(sql)]);
    remaining = dressRemaining(activeStock, active, opts.time);
  }
  return dresses.map<Dress>((d) => ({
    id: d.id,
    name: d.name,
    price: d.price,
    priceUsd: d.price_usd,
    image: d.image,
    modelSize: d.model_size,
    modelSpec: d.model_spec,
    active: d.active,
    sizes: stock
      .filter((s) => s.dress_id === d.id)
      .map((s) => ({
        size: s.size,
        quantity: s.quantity,
        remaining: remaining ? (remaining.get(`${d.id}|${s.size}`) ?? 0) : null,
      })),
  }));
}
