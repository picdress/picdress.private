import nodemailer, { type Transporter } from "nodemailer";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config";
import type { BookingView } from "./bookings";
import { longDate, won } from "./time";

// Gmail(picdress012@gmail.com 등) + 앱 비밀번호로 발송해요.
// 설정이 없으면 메일 대신 서버 로그(로컬은 .outbox 폴더)에 남겨요.

let transporter: Transporter | null = null;
function getTransport() {
  if (!config.gmailUser || !config.gmailAppPassword) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: config.gmailUser, pass: config.gmailAppPassword },
    });
  }
  return transporter;
}

async function send(to: string, subject: string, html: string) {
  const t = getTransport();
  if (!t) {
    console.log(`[메일 미설정] to=${to} subject=${subject}`);
    if (process.env.NODE_ENV !== "production") {
      const dir = join(process.cwd(), ".outbox");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${Date.now()}-${to.replace(/[^a-z0-9]/gi, "_")}.html`), `<!-- ${subject} -->\n${html}`);
    }
    return;
  }
  try {
    await t.sendMail({ from: `"${config.mailFromName}" <${config.gmailUser}>`, to, subject, html });
  } catch (e) {
    // 메일 실패가 예약/결제를 망가뜨리면 안 되니까 로그만 남겨요
    console.error("메일 발송 실패", subject, to, e);
  }
}

const C = { dark: "#485542", green: "#A2B798", light: "#F6FAF4", bg: "#E3E9E0" };

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:${C.bg};font-family:'Apple SD Gothic Neo','Malgun Gothic',serif;color:${C.dark}">
  <div style="max-width:440px;margin:0 auto;padding:28px 16px">
    <div style="text-align:center;font-size:26px;font-weight:700;letter-spacing:-0.5px;margin-bottom:18px">pic<span style="font-style:italic;font-weight:400">.dress</span></div>
    <div style="background:${C.light};border-radius:16px;padding:26px 22px">
      <h1 style="font-size:18px;margin:0 0 18px">${title}</h1>
      ${body}
    </div>
    <p style="font-size:12px;line-height:1.6;text-align:center;margin-top:18px">
      ${config.business.address} · ${config.business.phone}<br/>${config.business.email}
    </p>
  </div></body></html>`;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:6px 0;font-weight:700;width:84px;vertical-align:top">${label}</td><td style="padding:6px 0">${value}</td></tr>`;
}

function details(b: BookingView) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
    ${row("예약자", `${escape(b.customerName)} (${escape(b.phone)})`)}
    ${row("일정", `${longDate(b.slotDate)} ${b.slotTime}`)}
    ${row("드레스", `${escape(b.dressName)} · ${escape(b.dressSize)}`)}
    ${row("금액", b.currency === "USD" && b.amountUsd ? `$${b.amountUsd}` : won(b.amount))}
    ${row("예약번호", b.orderId)}
  </table>`;
}

function button(href: string, label: string) {
  return `<p style="text-align:center;margin:22px 0 4px"><a href="${href}" style="display:inline-block;background:${C.green};color:#fff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:40px">${label}</a></p>`;
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function manageUrl(b: BookingView) {
  return `${config.siteUrl}/booking/${b.manageToken}`;
}

export async function mailConfirmed(b: BookingView) {
  await send(
    b.email,
    `[pic.dress] 예약이 확정되었어요 (${longDate(b.slotDate)} ${b.slotTime})`,
    layout(
      "예약이 확정되었어요 🌿",
      `${details(b)}
      <p style="font-size:13px;line-height:1.7;margin-top:16px">방문 시간 5분 전까지 매장(${config.business.address})으로 와주세요.<br/>제휴 음식점·카페 쿠폰 3장은 현장에서 드려요.</p>
      ${button(manageUrl(b), "예약 확인 · 취소")}`,
    ),
  );
  await notifyAdmin(`새 예약 확정: ${b.customerName} ${longDate(b.slotDate)} ${b.slotTime}`, b);
}

export async function mailDepositRequest(b: BookingView, deadline: string) {
  await send(
    b.email,
    `[pic.dress] 입금해 주시면 예약이 확정돼요`,
    layout(
      "입금 안내",
      `${details(b)}
      <div style="background:${C.bg};border-radius:10px;padding:14px;margin-top:16px;font-size:14px;line-height:1.7">
        <b>입금 계좌</b><br/>${escape(config.bankAccount || "(계좌 정보 미설정)")}<br/>
        <b>입금자명</b> ${escape(b.customerName)}<br/>
        <b>입금 기한</b> ${deadline}까지
      </div>
      <p style="font-size:13px;line-height:1.7">기한 안에 입금이 확인되지 않으면 예약이 자동으로 취소돼요.</p>
      ${button(manageUrl(b), "예약 확인")}`,
    ),
  );
  await notifyAdmin(`입금 대기: ${b.customerName} ${longDate(b.slotDate)} ${b.slotTime}`, b);
}

export async function mailCancelled(b: BookingView) {
  const refundLine =
    b.refundAmount > 0
      ? b.paymentMode === "manual"
        ? `<p style="font-size:14px">환불 예정 금액: <b>${won(b.refundAmount)}</b><br/>환불 받으실 계좌를 이 메일에 회신해 주세요.</p>`
        : `<p style="font-size:14px">환불 금액: <b>${won(b.refundAmount)}</b><br/>결제 수단에 따라 영업일 기준 3~7일 안에 환불돼요.</p>`
      : "";
  await send(
    b.email,
    `[pic.dress] 예약이 취소되었어요`,
    layout("예약이 취소되었어요", `${details(b)}${refundLine}`),
  );
  await notifyAdmin(`예약 취소: ${b.customerName} ${longDate(b.slotDate)} ${b.slotTime} (환불 ${won(b.refundAmount)})`, b);
}

async function notifyAdmin(subject: string, b: BookingView) {
  if (!config.adminNotifyEmail) return;
  await send(config.adminNotifyEmail, `[pic.dress 관리] ${subject}`, layout(subject, details(b)));
}
