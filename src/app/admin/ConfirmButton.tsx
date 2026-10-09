"use client";

// 누르면 한 번 더 물어보고 제출하는 버튼 (환불처럼 되돌릴 수 없는 작업용)
export default function ConfirmButton({
  children,
  message,
  className,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        const form = e.currentTarget.form;
        let msg = message;
        const amount = form?.querySelector<HTMLInputElement>('input[name="refundAmount"]');
        if (amount) msg = msg.replace("{amount}", Number(amount.value.replace(/[^\d]/g, "") || 0).toLocaleString("ko-KR"));
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
