import type { Metadata } from "next";
import Header from "@/components/Header";
import { config } from "@/lib/config";
import styles from "./policy.module.css";

export const metadata: Metadata = { title: "이용약관 · 환불 규정 · 개인정보처리방침 — pic.dress" };

function refundLines() {
  const rules = config.refundRules;
  return rules.map((r, i) => {
    const pct = r.percent === 0 ? "환불 불가" : `결제 금액의 ${r.percent}% 환불`;
    if (r.daysBefore === 0) return `이용 당일 취소: ${pct}`;
    const prev = rules[i - 1];
    if (!prev) return `이용일 ${r.daysBefore}일 전까지 취소: ${pct}`;
    return `이용일 ${r.daysBefore}일 전 ~ ${prev.daysBefore - 1}일 전 취소: ${pct}`;
  });
}

// ※ 아래 문구는 기본 틀이에요. 운영 전 실제 운영 방식에 맞게 확인·수정해 주세요.
export default function PolicyPage() {
  const b = config.business;
  const operator = b.name || "pic.dress";
  return (
    <>
      <Header back />
      <main className={styles.main}>
        <section id="terms">
          <h1 className="title">이용약관</h1>
          <ol>
            <li>본 약관은 {operator}(이하 &quot;운영자&quot;)가 제공하는 드레스 투어 예약 서비스 이용에 관한 조건을 정합니다.</li>
            <li>상품은 드레스 대여 2시간과 제휴 음식점·카페 쿠폰 3장으로 구성되며, 예약한 일시에 매장에서 제공됩니다.</li>
            <li>예약은 결제(또는 입금 확인)가 완료된 때 확정됩니다.</li>
            <li>대여한 드레스를 훼손·오염·분실한 경우 수선비 또는 실비가 청구될 수 있습니다.</li>
            <li>예약 시간에 늦으면 이용 시간이 줄어들 수 있으며, 다음 예약을 위해 종료 시간은 연장되지 않습니다.</li>
            <li>천재지변이나 운영자 사정으로 이용이 불가능한 경우 운영자는 전액 환불합니다.</li>
          </ol>
        </section>

        <section id="refund">
          <h1 className="title">취소·환불 규정</h1>
          <ul>
            {refundLines().map((l) => (
              <li key={l}>{l}</li>
            ))}
            <li>예약 확인 메일의 &quot;예약 확인 · 취소&quot; 링크에서 직접 취소할 수 있으며, 환불 금액은 위 규정에 따라 자동 계산됩니다.</li>
            <li>카드·간편결제는 결제 수단으로 환불되며 카드사 사정에 따라 영업일 기준 3~7일이 걸릴 수 있습니다.</li>
            <li>계좌이체(무통장입금)로 결제한 경우 고객님 계좌로 환불해 드립니다.</li>
            <li>예약 시작 {config.bookingCutoffMinutes}분 전 이후에는 온라인 취소가 불가하며 매장으로 문의해 주세요.</li>
          </ul>
        </section>

        <section id="privacy">
          <h1 className="title">개인정보처리방침</h1>
          <dl>
            <dt>수집 항목</dt>
            <dd>성함, 휴대폰 번호, 이메일, 결제 기록(결제 수단, 승인 번호)</dd>
            <dt>수집 목적</dt>
            <dd>예약 확인·변경·취소 안내, 결제 및 환불 처리, 고객 문의 응대</dd>
            <dt>보유 기간</dt>
            <dd>
              행사 종료 후 30일 이내 파기. 단, 전자상거래법에 따라 계약·결제·환불 기록은 5년, 소비자 불만·분쟁 처리 기록은 3년간 보관합니다.
            </dd>
            <dt>처리 위탁</dt>
            <dd>토스페이먼츠(결제 처리), Google(예약 안내 메일 발송), 호스팅·DB 업체(서비스 운영)</dd>
            <dt>권리</dt>
            <dd>언제든지 개인정보 열람·정정·삭제를 요청할 수 있습니다.</dd>
            <dt>문의</dt>
            <dd>
              {b.email} · {b.phone}
            </dd>
          </dl>
        </section>

        {(b.name || b.regNo) && (
          <section>
            <h1 className="title">사업자 정보</h1>
            <p>
              {[b.name && `상호 ${b.name}`, b.owner && `대표 ${b.owner}`, b.regNo && `사업자등록번호 ${b.regNo}`, b.mailOrderNo && `통신판매업 신고 ${b.mailOrderNo}`, b.address]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </section>
        )}
      </main>
    </>
  );
}
