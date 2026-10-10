import type { Metadata } from "next";
import Header from "@/components/Header";
import { config, type RefundRule } from "@/lib/config";
import type { Locale } from "@/i18n";
import { getI18n } from "@/i18n/server";
import styles from "./policy.module.css";

export const metadata: Metadata = { title: "Terms · Refund · Privacy — pic.dress" };

// ※ 아래 문구는 기본 틀이에요. 운영 전 실제 운영 방식에 맞게 확인·수정해 주세요.
//   언어별 내용이 다를 경우 한국어 원문이 우선해요.

function refundLines(rules: RefundRule[], locale: Locale) {
  return rules.map((r, i) => {
    const prev = rules[i - 1];
    const none = r.percent === 0;
    if (locale === "en") {
      const pct = none ? "no refund" : `${r.percent}% refund`;
      if (r.daysBefore === 0) return `Cancelled on the day of use: ${pct}`;
      if (!prev) return `Cancelled ${r.daysBefore}+ days before: ${pct}`;
      return `Cancelled ${r.daysBefore}–${prev.daysBefore - 1} day(s) before: ${pct}`;
    }
    if (locale === "zh") {
      const pct = none ? "不予退款" : `退还${r.percent}%`;
      if (r.daysBefore === 0) return `使用当天取消：${pct}`;
      if (!prev) return `提前${r.daysBefore}天及以上取消：${pct}`;
      return `提前${r.daysBefore}~${prev.daysBefore - 1}天取消：${pct}`;
    }
    const pct = none ? "환불 불가" : `결제 금액의 ${r.percent}% 환불`;
    if (r.daysBefore === 0) return `이용 당일 취소: ${pct}`;
    if (!prev) return `이용일 ${r.daysBefore}일 전까지 취소: ${pct}`;
    return `이용일 ${r.daysBefore}일 전 ~ ${prev.daysBefore - 1}일 전 취소: ${pct}`;
  });
}

const TEXT = {
  ko: {
    terms: "이용약관",
    termsItems: (op: string) => [
      `본 약관은 ${op}(이하 "운영자")가 제공하는 드레스 투어 예약 서비스 이용에 관한 조건을 정합니다.`,
      "상품은 드레스 대여 2시간과 제휴 음식점·카페 쿠폰 3장으로 구성되며, 예약한 일시에 매장에서 제공됩니다.",
      "예약은 결제(또는 입금 확인)가 완료된 때 확정됩니다.",
      "대여한 드레스를 훼손·오염·분실한 경우 수선비 또는 실비가 청구될 수 있습니다.",
      "예약 시간에 늦으면 이용 시간이 줄어들 수 있으며, 다음 예약을 위해 종료 시간은 연장되지 않습니다.",
      "천재지변이나 운영자 사정으로 이용이 불가능한 경우 운영자는 전액 환불합니다.",
    ],
    refund: "취소·환불 규정",
    refundExtra: (cutoff: number) => [
      '예약 확인 메일의 "예약 확인 · 취소" 링크에서 직접 취소할 수 있으며, 환불 금액은 위 규정에 따라 자동 계산됩니다.',
      "카드·간편결제·해외결제는 결제한 수단으로 환불되며, 결제사 사정에 따라 영업일 기준 3~7일이 걸릴 수 있습니다.",
      "해외결제는 환율 변동으로 실제 환불액이 결제 당시와 다를 수 있습니다.",
      `예약 시작 ${cutoff}분 전 이후에는 온라인 취소가 불가하며 매장으로 문의해 주세요.`,
    ],
    privacy: "개인정보처리방침",
    privacyRows: [
      ["수집 항목", "성함, 연락처, 이메일, 결제 기록(결제 수단, 승인 번호)"],
      ["수집 목적", "예약 확인·변경·취소 안내, 결제 및 환불 처리, 고객 문의 응대"],
      ["보유 기간", "행사 종료 후 30일 이내 파기. 단, 전자상거래법에 따라 계약·결제·환불 기록은 5년, 소비자 불만·분쟁 처리 기록은 3년간 보관합니다."],
      ["처리 위탁", "포트원·토스페이먼츠·엑심베이(결제 처리), Google(예약 안내 메일 발송), 호스팅·DB 업체(서비스 운영)"],
      ["국외 이전", "해외결제 시 결제 처리를 위해 결제 정보가 해외 결제사(알리페이, 위챗페이, PayPal 등)로 전송될 수 있습니다."],
      ["권리", "언제든지 개인정보 열람·정정·삭제를 요청할 수 있습니다."],
      ["문의", "{contact}"],
    ],
    biz: "사업자 정보",
  },
  en: {
    terms: "Terms of Use",
    termsItems: (op: string) => [
      `These terms set out the conditions for using the dress tour booking service provided by ${op} (the "Operator").`,
      "The product consists of a 2-hour dress rental and 3 partner restaurant/café coupons, provided at the shop at your booked time.",
      "A booking is confirmed once payment (or transfer) is completed.",
      "Repair or replacement costs may be charged if a rented dress is damaged, stained or lost.",
      "If you arrive late, your rental time may be shortened; the end time cannot be extended because of the following booking.",
      "If the service cannot be provided due to natural disasters or the Operator's circumstances, you will receive a full refund.",
    ],
    refund: "Cancellation & Refund Policy",
    refundExtra: (cutoff: number) => [
      'You can cancel yourself via the "View or cancel booking" link in your confirmation email. The refund is calculated automatically according to the policy above.',
      "Card, mobile and international payments are refunded to the original payment method. It may take 3–7 business days depending on the provider.",
      "For international payments, the refunded amount in your currency may differ from the original due to exchange rates.",
      `Online cancellation is not available within ${cutoff} minutes of your booking time. Please contact the shop.`,
    ],
    privacy: "Privacy Policy",
    privacyRows: [
      ["What we collect", "Name, phone number, email, payment records (payment method, approval number)"],
      ["Why", "Booking confirmations and notices, payments and refunds, customer support"],
      ["How long", "Deleted within 30 days after the event ends, except contract, payment and refund records (5 years) and complaint records (3 years) kept as required by Korean e-commerce law."],
      ["Processors", "PortOne, Toss Payments, Eximbay (payments), Google (email), hosting and database providers (service operation)"],
      ["Transfers abroad", "For international payments, payment information may be sent to overseas providers (Alipay, WeChat Pay, PayPal, etc.)."],
      ["Your rights", "You may request access to, correction or deletion of your personal information at any time."],
      ["Contact", "{contact}"],
    ],
    biz: "Business information",
  },
  zh: {
    terms: "使用条款",
    termsItems: (op: string) => [
      `本条款规定了使用 ${op}（以下简称"运营方"）提供的礼服体验预约服务的条件。`,
      "商品包括2小时礼服租赁及3张合作餐厅/咖啡馆优惠券，于预约时间在店内提供。",
      "完成付款（或确认到账）后预约即生效。",
      "如租赁的礼服出现损坏、污损或遗失，可能需支付修补费或实际费用。",
      "如迟到，使用时间可能缩短；因后续预约，结束时间不予延长。",
      "因不可抗力或运营方原因无法提供服务时，将全额退款。",
    ],
    refund: "取消与退款规定",
    refundExtra: (cutoff: number) => [
      "您可以通过预约确认邮件中的「查看 · 取消预约」链接自行取消，退款金额将按上述规定自动计算。",
      "银行卡、移动支付及国际支付将原路退回，视支付机构不同可能需要3~7个工作日。",
      "国际支付因汇率变动，实际退款金额可能与支付时不同。",
      `预约开始前${cutoff}分钟内无法在线取消，请联系店铺。`,
    ],
    privacy: "隐私政策",
    privacyRows: [
      ["收集项目", "姓名、联系电话、电子邮箱、支付记录（支付方式、授权号）"],
      ["收集目的", "预约确认与通知、付款及退款处理、客户咨询"],
      ["保存期限", "活动结束后30天内删除。但根据韩国电子商务法，合同、付款及退款记录保存5年，投诉与纠纷处理记录保存3年。"],
      ["委托处理", "PortOne、Toss Payments、Eximbay（支付处理），Google（邮件发送），主机及数据库服务商（服务运营）"],
      ["跨境传输", "使用国际支付时，支付信息可能会传送至境外支付机构（支付宝、微信支付、PayPal等）。"],
      ["您的权利", "您可随时要求查阅、更正或删除您的个人信息。"],
      ["联系方式", "{contact}"],
    ],
    biz: "商家信息",
  },
};

const MANUAL_TEXT = {
  ko: {
    refund2: "결제하신 방법(토스·카카오페이 송금, PayPal, 계좌이체)으로 운영자가 직접 돌려드리며, 확인 후 영업일 기준 3일 이내에 처리합니다.",
    refund3: "PayPal로 결제한 경우 PayPal 환불로 처리되며, 환율·PayPal 정책에 따라 실제 환불액이 달라질 수 있습니다.",
    processors: "토스·카카오페이(송금 수취), PayPal(해외 결제 수취), Google(예약 안내 메일 발송), 호스팅·DB 업체(서비스 운영)",
    abroad: "PayPal로 결제하는 경우 결제 정보가 PayPal(해외)에서 처리됩니다.",
  },
  en: {
    refund2: "Refunds are sent back by the Operator the same way you paid (Toss/KakaoPay transfer, PayPal or bank transfer), within 3 business days of confirmation.",
    refund3: "PayPal payments are refunded through PayPal; the final amount may differ due to exchange rates and PayPal's policies.",
    processors: "Toss and KakaoPay (receiving transfers), PayPal (international payments), Google (email), hosting and database providers (service operation)",
    abroad: "If you pay with PayPal, your payment information is processed by PayPal outside Korea.",
  },
  zh: {
    refund2: "退款将由运营方按您的付款方式（Toss/KakaoPay 转账、PayPal 或银行转账）原路退回，确认后3个工作日内处理。",
    refund3: "通过 PayPal 付款的订单将经 PayPal 退款，实际退款金额可能因汇率及 PayPal 政策而不同。",
    processors: "Toss、KakaoPay（收款），PayPal（国际支付收款），Google（邮件发送），主机及数据库服务商（服务运营）",
    abroad: "使用 PayPal 付款时，支付信息将由境外的 PayPal 处理。",
  },
};

export default async function PolicyPage() {
  const { locale } = await getI18n();
  const base = TEXT[locale];
  const manual = config.paymentMode === "manual";
  const m = MANUAL_TEXT[locale];
  const x = manual
    ? {
        ...base,
        refundExtra: (cutoff: number) => {
          const items = base.refundExtra(cutoff);
          return [items[0], m.refund2, m.refund3, items[3]];
        },
        privacyRows: base.privacyRows.map(([k, v], i) => (i === 3 ? [k, m.processors] : i === 4 ? [k, m.abroad] : [k, v])),
      }
    : base;
  const b = config.business;
  const operator = b.name || "pic.dress";
  const contact = `${b.email} · ${locale === "ko" ? b.phone : `+82 ${b.phone.replace(/^0/, "")}`}`;
  return (
    <>
      <Header back="/" />
      <main className={styles.main}>
        <section id="terms">
          <h1 className="title">{x.terms}</h1>
          <ol>
            {x.termsItems(operator).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
        </section>

        <section id="refund">
          <h1 className="title">{x.refund}</h1>
          <ul>
            {[...refundLines(config.refundRules, locale), ...x.refundExtra(config.bookingCutoffMinutes)].map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>

        <section id="privacy">
          <h1 className="title">{x.privacy}</h1>
          <dl>
            {x.privacyRows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v.replace("{contact}", contact)}</dd>
              </div>
            ))}
          </dl>
        </section>

        {(b.name || b.regNo) && (
          <section>
            <h1 className="title">{x.biz}</h1>
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
