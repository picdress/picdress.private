// 피그마의 꺾쇠(Vector 1) — 아래 방향 기본, open이면 위 방향
export default function Chevron({
  width = 22,
  height = 10,
  open = false,
  strokeWidth = 1.6,
}: {
  width?: number;
  height?: number;
  open?: boolean;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden
      style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .25s ease", flexShrink: 0 }}
    >
      <path
        d={`M1 1 ${width / 2} ${height - 1} ${width - 1} 1`}
        stroke="var(--dark)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
