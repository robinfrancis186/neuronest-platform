import { Leaf } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "../i18n";

export function Badge({
  children,
  tone = "sage",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  const tr = useTranslation();
  return (
    <div className="empty">
      <Leaf size={27} />
      <strong>{tr(title)}</strong>
      <p>{children || tr("Your updates will appear here when you add them.")}</p>
    </div>
  );
}
export function Section({
  title,
  eyebrow,
  action,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const tr = useTranslation();
  return (
    <section className={`card ${className}`}>
      <div className="section-head">
        <div>
          {eyebrow && <div className="eyebrow">{tr(eyebrow)}</div>}
          <h2>{tr(title)}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Status({ value }: { value: unknown }) {
  const tr = useTranslation();
  const s = String(value ?? "pending");
  return (
    <Badge
      tone={
        ["cancelled", "rejected", "failed", "suspended", "unavailable", "dead"].includes(s)
          ? "peach"
          : [
                "pending",
                "awaiting_payment",
                "quarantined",
                "draft",
                "processing",
                "unmatched",
                "review_required",
                "reconciliation_required",
              ].includes(s)
            ? "sand"
            : "sage"
      }
    >
      {tr(s.replaceAll("_", " "))}
    </Badge>
  );
}
export function NestIllustration() {
  return (
    <div className="nest-illustration" aria-hidden="true">
      <div className="illustration-orbit" />
      <div className="illustration-leaf one" />
      <div className="illustration-leaf two" />
      <div className="illustration-leaf three" />
      <div className="little-sun" />
      <svg viewBox="0 0 260 220">
        <path
          d="M65 185C89 137 130 163 151 101C169 48 204 32 220 35"
          fill="none"
          stroke="#6b9077"
          strokeWidth="3"
        />
        <path
          d="M125 142C89 140 68 116 76 97C105 94 128 112 125 142M157 91C130 78 123 51 136 37C160 46 169 64 157 91M175 65C182 34 212 20 227 31C222 55 197 70 175 65"
          fill="#93ac87"
        />
        <ellipse cx="114" cy="170" rx="75" ry="31" fill="#d1a781" />
        <path
          d="M43 162Q114 218 187 162M48 174Q115 218 182 174M60 186Q115 211 170 186"
          stroke="#906e52"
          strokeWidth="3"
          fill="none"
        />
        <ellipse
          cx="107"
          cy="145"
          rx="27"
          ry="35"
          fill="#f5eadb"
          transform="rotate(-14 107 145)"
        />
        <ellipse
          cx="143"
          cy="151"
          rx="22"
          ry="29"
          fill="#ecd3bb"
          transform="rotate(18 143 151)"
        />
        <circle cx="204" cy="120" r="5" fill="#c49473" />
        <path d="M55 52v12M49 58h12" stroke="#c49473" strokeWidth="2" />
      </svg>
    </div>
  );
}
