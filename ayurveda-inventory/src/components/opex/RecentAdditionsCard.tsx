"use client";

type RecentItem = {
  id: string;
  name: string;
  subcat: string | null;
  dept: string | null;
  supplier: string | null;
  createdAt: string | null;
  expiry: string | null;
};

type Props = {
  items: RecentItem[];
  addedThisMonth: number;
  medicines: number;
  consumables: number;
};

function openRegistryDeepLink(params: Record<string, unknown>) {
  try {
    sessionStorage.setItem("registryDeepLink", JSON.stringify(params));
    window.dispatchEvent(new CustomEvent("open-registry"));
  } catch {
    // ignore
  }
}

export default function RecentAdditionsCard({ items, addedThisMonth, medicines, consumables }: Props) {
  const recentItems = items
    .filter((item) => item.createdAt)
    .slice(0, 5);

  return (
    <div className="card" style={{ gridColumn: "1 / -1" }}>
      <div className="card-head">
        <span className="card-title">Recent OPEX additions</span>
        <a
          className="view-link"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            openRegistryDeepLink({ category: "OPEX", bannerMsg: "← From Dashboard → Recent OPEX additions" });
          }}
        >
          Open registry →
        </a>
      </div>
      <div className="card-body" style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, alignItems: "start" }}>
          <div>
            <div className="kpi-num green" style={{ marginBottom: 2 }}>{addedThisMonth}</div>
            <div className="kpi-lbl">Added this month</div>
            <div className="kpi-sub">latest registry-backed items</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <span className="pill pill-green">{medicines} medicines</span>
              <span className="pill pill-blue">{consumables} consumables</span>
            </div>
          </div>

          <div className="activity-list">
            {recentItems.length ? recentItems.map((item) => (
              <div className="act-row" key={item.id} style={{ padding: "8px 0" }}>
                <div className="act-icon green">＋</div>
                <div className="act-content">
                  <div className="act-title">
                    {item.name}
                    <span className="pill pill-green" style={{ marginLeft: 4 }}>{item.subcat || "item"}</span>
                  </div>
                  <div className="act-detail">
                    {item.dept || "No dept"} · {item.supplier || "No supplier"}
                    {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : ""}
                  </div>
                </div>
                <a
                  className="view-link"
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    openRegistryDeepLink({ category: "OPEX", search: item.name, highlight: item.id, bannerMsg: `← From Dashboard → ${item.name}` });
                  }}
                >
                  View
                </a>
              </div>
            )) : (
              <div style={{ padding: 10, color: "var(--text-dim)" }}>No recent OPEX additions found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}