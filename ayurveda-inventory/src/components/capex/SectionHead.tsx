"use client";

type Props = { badge: string; title: string; sub?: string };

export default function SectionHead({ badge, title, sub }: Props) {
  return (
    <div className="section-head">
      <span className="capex-badge">{badge}</span>
      <span className="section-title">{title}</span>
      {sub && <span className="section-sub">{sub}</span>}
    </div>
  );
}
