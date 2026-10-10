import nodemailer, { type Transporter } from "nodemailer";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config, sendLink, usesAccount, type ManualMethod } from "./config";
import type { BookingView } from "./bookings";
import { dressName, fmt, getMessages, longDate, money, usd, withRo } from "@/i18n";
import { formatKst } from "./time";

// Gmail(picdress012@gmail.com) + 앱 비밀번호로 발송해요.
// 고객 메일은 예약할 때 쓴 언어로, 관리자 알림은 한국어로 보내요.
// 설정이 없으면 메일 대신 서버 로그(로컬은 .outbox 폴더)에 남겨요.

let transporter: Transporter | null = null;
function getTransport() {
  if (!config.gmailUser || !config.gmailAppPassword) return null;
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: config.gmailUser, pass: config.gmailAppPassword.replace(/\s/g, "") },
  });
  return transporter;
}

/** 메일 오류를 관리자가 알아볼 수 있는 한국어로 */
export function mailErrorText(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/535|Invalid login|Username and Password not accepted|BadCredentials/i.test(msg))
    return "Gmail 로그인 실패 — GMAIL_APP_PASSWORD에 '앱 비밀번호' 16자리를 넣었는지 확인하세요 (일반 Gmail 비밀번호는 안 돼요). GMAIL_USER도 그 계정 주소여야 해요.";
  if (/Application-specific password required|534/i.test(msg))
    return "Gmail이 앱 비밀번호를 요구해요 — Google 계정 → 보안 → 2단계 인증을 켠 뒤 앱 비밀번호를 만들어 GMAIL_APP_PASSWORD에 넣으세요.";
  if (/ETIMEDOUT|ECONNECTION|ECONNREFUSED|ENOTFOUND/i.test(msg)) return `Gmail 서버에 연결하지 못했어요 (${msg.slice(0, 120)})`;
  return msg.slice(0, 200);
}

export const MAIL_NOT_CONFIGURED = "메일 설정이 없어요 — Vercel 환경변수에 GMAIL_USER와 GMAIL_APP_PASSWORD를 넣고 다시 배포하세요.";

/** 보내고 결과를 돌려줘요: 성공이면 null, 실패면 이유 (예약·결제 처리는 메일 실패와 상관없이 계속돼요) */
async function send(to: string, subject: string, html: string): Promise<string | null> {
  const t = getTransport();
  if (!t) {
    console.log(`[메일 미설정] to=${to} subject=${subject}`);
    if (process.env.NODE_ENV !== "production" || process.env.MAIL_OUTBOX) {
      const dir = join(process.cwd(), ".outbox");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${Date.now()}-${to.replace(/[^a-z0-9]/gi, "_")}.html`), `<!-- ${subject} -->\n${html}`);
      return null;
    }
    return MAIL_NOT_CONFIGURED;
  }
  try {
    await t.sendMail({ from: `"${config.mailFromName}" <${config.gmailUser}>`, to, subject, html });
    return null;
  } catch (e) {
    console.error("메일 발송 실패", subject, to, e);
    return mailErrorText(e);
  }
}

/** 관리자 화면의 '테스트 메일 보내기' */
export async function sendTestMail(to: string) {
  return send(
    to,
    "[pic.dress] 테스트 메일",
    layout("테스트 메일이에요", `<p style="font-size:14px;line-height:1.7">이 메일이 보이면 예약 확정·취소 메일도 잘 나가요. 🌿</p>`),
  );
}

const C = { dark: "#485542", green: "#A2B798", light: "#F6FAF4", bg: "#E3E9E0" };

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:${C.bg};font-family:'Apple SD Gothic Neo','Malgun Gothic','PingFang SC','Microsoft YaHei',serif;color:${C.dark}">
  <div style="max-width:440px;margin:0 auto;padding:28px 16px">
    <div style="text-align:center;font-size:26px;font-weight:700;letter-spacing:-0.5px;margin-bottom:18px">pic<span style="font-style:italic;font-weight:400">.dress</span></div>
    <div style="background:${C.light};border-radius:16px;padding:26px 22px">
      <h1 style="font-size:18px;margin:0 0 18px">${title}</h1>
      ${body}
    </div>
    <p style="font-size:12px;line-height:1.6;text-align:center;margin-top:18px">
      ${esc(config.business.address)} · ${esc(config.business.phone)}<br/>${esc(config.business.email)} · Instagram @pic.dress
    </p>
  </div></body></html>`;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:6px 0;font-weight:700;width:96px;vertical-align:top">${label}</td><td style="padding:6px 0">${value}</td></tr>`;
}

function amountText(b: BookingView) {
  return b.currency === "USD" && b.amountUsd ? usd(b.amountUsd) : money(b.amount, b.locale);
}

function details(b: BookingView, extra = "") {
  const t = getMessages(b.locale).mail;
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
    ${row(t.rowCustomer, `${esc(b.customerName)} (${esc(b.phone)})`)}
    ${row(t.rowSchedule, `${longDate(b.slotDate, b.locale)} ${b.slotTime}`)}
    ${row(t.rowDress, `${esc(dressName({ name: b.dressName, nameEn: b.dressNameEn, nameZh: b.dressNameZh }, b.locale))} · ${esc(b.dressSize)}`)}
    ${row(t.rowAmount, amountText(b))}
    ${row(t.rowOrder, b.orderId)}
    ${extra}
  </table>`;
}

function button(href: string, label: string) {
  return `<p style="text-align:center;margin:22px 0 4px"><a href="${href}" style="display:inline-block;background:${C.green};color:#fff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:40px">${label}</a></p>`;
}

function manageUrl(b: BookingView) {
  return `${config.siteUrl}/booking/${b.manageToken}`;
}

export async function mailConfirmed(b: BookingView) {
  const t = getMessages(b.locale).mail;
  const err = await send(
    b.email,
    fmt(t.confirmedSubject, { date: longDate(b.slotDate, b.locale), time: b.slotTime }),
    layout(
      t.confirmedTitle,
      `${details(b)}
      <p style="font-size:13px;line-height:1.7;margin-top:16px">${fmt(t.confirmedBody, { address: esc(config.business.address) })}</p>
      ${button(manageUrl(b), t.manage)}`,
    ),
  );
  await notifyAdmin(`새 예약 확정: ${b.customerName} ${longDate(b.slotDate, "ko")} ${b.slotTime} (${MANUAL_ADMIN[b.paymentMethod ?? ""] ?? b.paymentMethod ?? ""})`, b);
  return err;
}

export async function mailDepositRequest(b: BookingView) {
  const all = getMessages(b.locale);
  const t = all.mail;
  const tb = all.booking;
  const pm = (b.paymentMethod ?? "BANK") as ManualMethod;
  const label = (all.payment.method as Record<string, string>)[pm] ?? pm;

  if (pm === "ONSITE") {
    const err = await send(
      b.email,
      t.onsiteSubject,
      layout(tb.onsiteTitle, `${details(b)}<p style="font-size:14px;line-height:1.7;margin-top:16px">${fmt(tb.onsiteBody, { amount: money(b.amount, b.locale) })}</p>${button(manageUrl(b), t.view)}`),
    );
    await notifyAdmin(`현장 결제 예약: ${b.customerName} ${longDate(b.slotDate, "ko")} ${b.slotTime}`, b);
    return err;
  }

  const amount = pm === "PAYPAL" && b.amountUsd ? usd(b.amountUsd) : money(b.amount, b.locale);
  const link = sendLink(pm, b.amount, b.amountUsd ?? "0");
  const showsAccount = usesAccount(pm);
  const extra =
    (showsAccount ? row(t.rowBank, esc(config.bankAccount || "-")) + row(t.rowDepositor, esc(b.customerName)) : "") +
    row(t.rowDeadline, formatKst(b.holdExpiresAt));
  const err = await send(
    b.email,
    t.paySubject,
    layout(
      tb.payTitle,
      `${details(b, extra)}
      <p style="font-size:14px;line-height:1.7;margin-top:16px"><b>${fmt(tb.payWith, { method: label, methodRo: withRo(label), amount })}</b></p>
      ${/^https?:/.test(link) ? button(link, fmt(tb.openLink, { method: label, methodRo: withRo(label) })) : ""}
      <p style="font-size:13px;line-height:1.7">${fmt(showsAccount ? tb.bankNote : tb.memoNote, { name: esc(b.customerName) })}<br/>${tb.checkNote}</p>
      ${button(manageUrl(b), t.view)}`,
    ),
  );
  await notifyAdmin(`결제 대기 (${MANUAL_ADMIN[pm] ?? pm}): ${b.customerName} ${longDate(b.slotDate, "ko")} ${b.slotTime} — ${amount}`, b);
  return err;
}

const MANUAL_ADMIN: Record<string, string> = {
  TOSS_SEND: "토스 송금",
  KAKAOPAY_SEND: "카카오페이 송금",
  PAYPAL: "PayPal",
  BANK: "계좌이체",
  ONSITE: "현장 결제",
};

export async function mailCancelled(b: BookingView) {
  const t = getMessages(b.locale).mail;
  const refund =
    b.refundAmount > 0
      ? `<p style="font-size:14px;line-height:1.7">${fmt(b.paymentMode === "manual" ? t.refundManual : t.refundOnline, { amount: b.refundUsd ? usd(b.refundUsd) : money(b.refundAmount, b.locale) })}</p>`
      : "";
  const err = await send(b.email, t.cancelledSubject, layout(t.cancelledTitle, `${details(b)}${refund}`));
  await notifyAdmin(`예약 취소: ${b.customerName} ${longDate(b.slotDate, "ko")} ${b.slotTime} (환불 ${money(b.refundAmount, "ko")})`, b);
  return err;
}

/** 관리자가 '환불 송금 완료'를 누르면 손님에게 알려요 */
export async function mailRefundDone(b: BookingView) {
  const t = getMessages(b.locale).mail;
  const amount = b.refundUsd ? usd(b.refundUsd) : money(b.refundAmount, b.locale);
  return send(
    b.email,
    t.refundDoneSubject,
    layout(t.refundDoneTitle, `${details(b)}<p style="font-size:14px;line-height:1.7;margin-top:16px">${fmt(t.refundDoneBody, { amount })}</p>`),
  );
}

async function notifyAdmin(subject: string, b: BookingView) {
  if (!config.adminNotifyEmail) return;
  await send(config.adminNotifyEmail, `[pic.dress 관리] ${subject}`, layout(esc(subject), details({ ...b, locale: "ko" })));
}
