import React from "react";
import { Item } from "../../types/items";

export default function SelectedItemCard({ item, onChange, onClear, style, changeLabel = "Change item" }: {
  item: Item;
  onChange?: () => void;
  onClear?: () => void;
  style?: React.CSSProperties;
  changeLabel?: string;
}) {
  return (
    <div className="selected-item" style={style}>
      <div className="si-info">
        <div className="si-name">{item.name}</div>
        <div className="si-sub">{item.id} · {item.sub}</div>
        <div className="si-badges">
          <span className={`badge ${item.category === "CAPEX" ? "badge-capex" : "badge-opex"}`}>{item.category}</span>
          <span className="badge badge-sub">{item.subcat}</span>
          <span className="badge badge-sub">{item.currentStock.toLocaleString()} {item.unit} {style && style.cursor === "default" ? "current stock" : "in stock"}</span>
        </div>
      </div>
      <span className="si-change" onClick={() => (onClear ? onClear() : onChange ? onChange() : undefined)}>{changeLabel}</span>
    </div>
  );
}
