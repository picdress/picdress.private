import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { listDresses } from "@/lib/dresses";
import AdminNav from "../AdminNav";
import Flash from "../Flash";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "드레스 관리 — pic.dress 관리자", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DressesAdmin({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const dresses = await listDresses({ includeInactive: true });

  return (
    <main className={styles.main} data-admin>
      <AdminNav active="dresses" />
      <Flash msg={sp.msg} err={sp.err} />
      <p className={styles.help}>
        같은 드레스·사이즈는 대여 시간({config.rentalMinutes}분
        {config.dressBufferMinutes ? ` + 정리 ${config.dressBufferMinutes}분` : ""}) 동안 다른 사람이 예약할 수 없어요. 수량이 2벌이면 겹치는
        시간에 2명까지 받아요.
      </p>
      {dresses.map((d) => (
        <form key={d.id} action="/api/admin/dresses" method="post" className={styles.dress}>
          <input type="hidden" name="id" value={d.id} />
          <img src={d.image} alt="" />
          <div className={styles.dressFields}>
            <label>
              이름
              <input name="name" defaultValue={d.name} />
            </label>
            <label>
              영어 이름
              <input name="nameEn" defaultValue={d.nameEn ?? ""} />
            </label>
            <label>
              중국어 이름
              <input name="nameZh" defaultValue={d.nameZh ?? ""} />
            </label>
            <label>
              대여비(원)
              <input name="price" inputMode="numeric" defaultValue={d.price} />
            </label>
            <label>
              해외결제 달러 가격($)
              <input name="priceUsd" inputMode="decimal" defaultValue={d.priceUsd ?? ""} placeholder="해외결제를 달러로 받을 때만" />
            </label>
            <label>
              모델 착용 사이즈
              <input name="modelSize" defaultValue={d.modelSize ?? ""} />
            </label>
            <label>
              모델 스펙
              <input name="modelSpec" defaultValue={d.modelSpec ?? ""} />
            </label>
            <fieldset>
              <legend>사이즈별 보유 수량</legend>
              {d.sizes.map((s) => (
                <label key={s.size} className={styles.qty}>
                  {s.size}
                  <input name={`qty:${s.size}`} type="number" min={0} max={99} defaultValue={s.quantity} />
                </label>
              ))}
            </fieldset>
            <label className={styles.check}>
              <input type="checkbox" name="active" defaultChecked={d.active} /> 예약 화면에 보이기
            </label>
            <button type="submit" className={styles.btnPrimary}>
              저장
            </button>
          </div>
        </form>
      ))}
      <p className={styles.help}>
        드레스를 새로 추가하거나 사진을 바꾸려면 개발 쪽 작업이 필요해요 (사진 파일 + DB 한 줄).
      </p>
    </main>
  );
}
