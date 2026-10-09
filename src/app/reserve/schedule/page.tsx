"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import { useReservation } from "../useReservation";
import styles from "../reserve.module.css";

type Slot = { time: string; remaining: number; closed: boolean };
type Overview = { openStart: string; openEnd: string; openDates: string[]; dates: Record<string, number> };

const WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

// 02_예약_날짜선택 + 02_예약_시간선택
export default function SchedulePage() {
  const router = useRouter();
  const { r, update, ready } = useReservation();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [date, setDate] = useState<string>();
  const [time, setTime] = useState<string>();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!r.name || !r.phone) {
      router.replace("/reserve");
      return;
    }
    if (r.date) setDate(r.date);
    if (r.time) setTime(r.time);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    fetch("/api/availability")
      .then((res) => res.json())
      .then(setOverview)
      .catch(() => setError("일정을 불러오지 못했어요. 새로고침해 주세요."));
  }, []);

  const loadSlots = useCallback(async (d: string) => {
    try {
      const res = await fetch(`/api/availability?date=${d}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setError("시간 정보를 불러오지 못했어요.");
    }
  }, []);

  // 날짜를 고르면 시간표 불러오고, 화면에 있는 동안 15초마다 남은 자리 새로고침
  useEffect(() => {
    if (!date) return;
    setSlots(null);
    loadSlots(date);
    const t = setInterval(() => loadSlots(date), 15_000);
    return () => clearInterval(t);
  }, [date, loadSlots]);

  // 고른 시간이 마감되면 선택 해제
  useEffect(() => {
    if (!slots || !time) return;
    const s = slots.find((x) => x.time === time);
    if (!s || s.closed || s.remaining <= 0) setTime(undefined);
  }, [slots, time]);

  const weeks = useMemo(() => {
    if (!overview) return [];
    const start = addDays(overview.openStart, -weekday(overview.openStart));
    const end = addDays(overview.openEnd, 6 - weekday(overview.openEnd));
    const rows: string[][] = [];
    for (let d = start; d <= end; d = addDays(d, 7)) rows.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
    return rows;
  }, [overview]);

  const monthLabel = overview ? `${overview.openStart.slice(0, 4)}. ${Number(overview.openStart.slice(5, 7))}.` : "";

  function pickDate(d: string) {
    setDate(d);
    setTime(undefined);
    setError("");
  }

  function next() {
    if (!date || !time) return;
    update({ date, time });
    router.push("/reserve/dress");
  }

  return (
    <>
      <Header back />
      <div className={btn.page}>
        <section className={styles.schedule} data-empty={!date}>
          <h1 className={`title ${styles.blockTitle}`}>날짜 선택</h1>
          <div className={styles.calendar}>
            <p className={`title ${styles.month}`}>{monthLabel}</p>
            <div className={styles.week} role="grid" aria-label="날짜 선택">
              {WEEK.map((w) => (
                <div key={w} className={styles.weekday} role="columnheader">
                  {w}
                </div>
              ))}
              {weeks.flat().map((d) => {
                const open = overview!.openDates.includes(d);
                const left = overview!.dates[d] ?? 0;
                const disabled = !open || left <= 0;
                return (
                  <button
                    key={d}
                    type="button"
                    className={styles.day}
                    disabled={disabled}
                    aria-pressed={date === d}
                    aria-label={`${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일${disabled ? " 예약 불가" : ""}`}
                    onClick={() => pickDate(d)}
                  >
                    {Number(d.slice(8))}
                  </button>
                );
              })}
            </div>
            {!overview && !error && <p className={styles.loading}>불러오는 중…</p>}
          </div>
        </section>

        {date && (
          <section className={styles.times}>
            <h2 className={`title ${styles.blockTitle}`}>시간 선택</h2>
            {!slots ? (
              <p className={styles.loading}>남은 자리 확인 중…</p>
            ) : (
              <div className={styles.timeGrid}>
                {slots.map((s) => {
                  const off = s.closed || s.remaining <= 0;
                  return (
                    <button
                      key={s.time}
                      type="button"
                      className={styles.time}
                      disabled={off}
                      aria-pressed={time === s.time}
                      onClick={() => setTime(s.time)}
                    >
                      <b>{s.time}</b>
                      <small>{off ? "(마감)" : `(${s.remaining}자리 남음)`}</small>
                    </button>
                  );
                })}
              </div>
            )}
            <p className={styles.notice}>드레스 대여는 2시간이에요. 선택한 시간부터 2시간 동안 이용할 수 있어요.</p>
          </section>
        )}

        <div className={btn.bottom}>
          {error && <p className={btn.error}>{error}</p>}
          {date && time && (
            <button type="button" className={btn.primary} onClick={next}>
              다음으로
            </button>
          )}
        </div>
      </div>
    </>
  );
}
