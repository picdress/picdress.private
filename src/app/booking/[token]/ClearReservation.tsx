"use client";

import { useEffect } from "react";

// 예약이 끝났으니 예약 단계 입력값 지우기
export default function ClearReservation() {
  useEffect(() => {
    try {
      sessionStorage.removeItem("pd_reservation");
    } catch {}
  }, []);
  return null;
}
