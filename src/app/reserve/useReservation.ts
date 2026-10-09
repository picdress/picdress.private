"use client";

import { useCallback, useEffect, useState } from "react";

// 예약 단계별 입력값을 sessionStorage에 보관 (새로고침해도 유지, 탭 닫으면 사라짐)

export type Reservation = {
  name?: string;
  phone?: string;
  email?: string;
  agreed?: boolean;
  date?: string;
  time?: string;
  dressId?: string;
  size?: string;
  orderId?: string;
};

const KEY = "pd_reservation";

function read(): Reservation {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function useReservation() {
  const [state, setState] = useState<Reservation>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(read());
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<Reservation>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
    setState({});
  }, []);

  return { r: state, update, reset, ready };
}

export function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function shortDate(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}`;
}

export function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}
